const mongoose = require('mongoose');

const userSchema= new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    plan: {
        type: String,
        enum: ['free', 'premium'],
        default: 'free'
    },
    githubAccessToken: {
        type: String,
        default: null
    },
    githubUsername: {
        type: String,
        default: null
    },
    premiumPurchasedAt: {
        type: Date,
        default: null
    }
});

module.exports = mongoose.model('User', userSchema);