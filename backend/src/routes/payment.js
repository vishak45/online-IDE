const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET || 'qwertyuioplkjhgfdsazxcvbnm';

// Lemon Squeezy config (Test Mode - FREE, no KYC)
// Get keys from: https://app.lemonsqueezy.com/settings/api
const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY;
const LEMONSQUEEZY_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID;
const LEMONSQUEEZY_VARIANT_ID = process.env.LEMONSQUEEZY_VARIANT_ID;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Lemon Squeezy API base URL
const LEMON_API_URL = 'https://api.lemonsqueezy.com/v1';

// Middleware to verify JWT token
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided', status: false });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ message: 'User not found', status: false });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token', status: false });
    }
};

// Get user's current plan
router.get('/plan', authMiddleware, async (req, res) => {
    try {
        res.json({
            plan: req.user.plan,
            premiumPurchasedAt: req.user.premiumPurchasedAt,
            status: true
        });
    } catch (error) {
        res.status(500).json({ message: error.message, status: false });
    }
});

// Create Lemon Squeezy Checkout
router.post('/create-checkout', authMiddleware, async (req, res) => {
    try {
        if (req.user.plan === 'premium') {
            return res.status(400).json({ 
                message: 'You already have a premium plan', 
                status: false 
            });
        }

        if (!LEMONSQUEEZY_API_KEY || !LEMONSQUEEZY_STORE_ID || !LEMONSQUEEZY_VARIANT_ID) {
            return res.status(500).json({ 
                message: 'Lemon Squeezy is not configured. Use demo upgrade instead.', 
                status: false,
                useDemo: true
            });
        }

        // Create checkout session
        const response = await axios.post(
            `${LEMON_API_URL}/checkouts`,
            {
                data: {
                    type: 'checkouts',
                    attributes: {
                        checkout_data: {
                            email: req.user.email,
                            name: req.user.name,
                            custom: {
                                user_id: req.user._id.toString()
                            }
                        },
                        product_options: {
                            redirect_url: `${FRONTEND_URL}?payment=success`,
                            receipt_button_text: 'Go to Online IDE',
                            receipt_link_url: FRONTEND_URL
                        }
                    },
                    relationships: {
                        store: {
                            data: {
                                type: 'stores',
                                id: LEMONSQUEEZY_STORE_ID
                            }
                        },
                        variant: {
                            data: {
                                type: 'variants',
                                id: LEMONSQUEEZY_VARIANT_ID
                            }
                        }
                    }
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`,
                    'Content-Type': 'application/vnd.api+json',
                    'Accept': 'application/vnd.api+json'
                }
            }
        );

        const checkoutUrl = response.data.data.attributes.url;

        res.json({
            checkoutUrl,
            status: true
        });
    } catch (error) {
        console.error('Lemon Squeezy checkout error:', error.response?.data || error);
        res.status(500).json({ 
            message: error.response?.data?.errors?.[0]?.detail || error.message, 
            status: false 
        });
    }
});

// Webhook to handle successful payments
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const event = JSON.parse(req.body.toString());
        
        // Handle order_created event
        if (event.meta?.event_name === 'order_created') {
            const customData = event.meta?.custom_data || event.data?.attributes?.first_order_item?.custom_data;
            const userId = customData?.user_id;

            if (userId) {
                await User.findByIdAndUpdate(userId, {
                    plan: 'premium',
                    premiumPurchasedAt: new Date(),
                    lemonSqueezyOrderId: event.data?.id
                });
                console.log(`User ${userId} upgraded to premium via Lemon Squeezy webhook`);
            }
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Verify payment (called after redirect back from Lemon Squeezy)
router.post('/verify', authMiddleware, async (req, res) => {
    try {
        // For Lemon Squeezy, we upgrade via webhook
        // This endpoint is for manual verification/upgrade after redirect
        
        // Check if user was already upgraded via webhook
        const user = await User.findById(req.user._id);
        
        if (user.plan === 'premium') {
            const token = jwt.sign(
                { userId: user._id, email: user.email },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.json({
                message: 'You are a premium user!',
                status: true,
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    plan: user.plan
                }
            });
        }

        // If webhook hasn't processed yet, upgrade anyway (for demo purposes)
        await User.findByIdAndUpdate(req.user._id, {
            plan: 'premium',
            premiumPurchasedAt: new Date()
        });

        const updatedUser = await User.findById(req.user._id);
        const token = jwt.sign(
            { userId: updatedUser._id, email: updatedUser.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Payment successful! You are now a premium user.',
            status: true,
            token,
            user: {
                id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                plan: updatedUser.plan
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message, status: false });
    }
});

// Demo: Direct upgrade for testing (remove in production)
router.post('/demo-upgrade', authMiddleware, async (req, res) => {
    try {
        if (req.user.plan === 'premium') {
            return res.status(400).json({ 
                message: 'You already have a premium plan', 
                status: false 
            });
        }

        await User.findByIdAndUpdate(req.user._id, {
            plan: 'premium',
            premiumPurchasedAt: new Date()
        });

        const updatedUser = await User.findById(req.user._id);

        res.json({
            message: 'Demo upgrade successful! You are now a premium user.',
            status: true,
            user: {
                id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                plan: updatedUser.plan
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message, status: false });
    }
});

module.exports = router;
