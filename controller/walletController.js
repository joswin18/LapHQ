const Wallet = require('../model/walletModel');
const User = require('../model/userModel');

let wallet = async(req,res)=>{
    try {
        const userId = req.session.user_id; // Assuming you store user ID in session
        const wallet = await Wallet.findOne({ user: userId });
        
        if (wallet) {
            res.json({ success: true, wallet: wallet });
        } else {
            res.json({ success: false, message: 'Wallet not found' });
        }
    } catch (error) {
        console.error('Error fetching wallet data:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

module.exports = {
    wallet
};