import { auth } from '../lib/auth.js';

// -----------------------------------------------
// GET /api/user/profile
// requireAuth
// -----------------------------------------------
export const getProfile = async (req, res) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// -----------------------------------------------
// PUT /api/user/profile
// requireAuth
// Body: { name, phone, address }
// -----------------------------------------------
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (phone !== undefined) updates.phone = String(phone).trim();
    if (address !== undefined) updates.address = String(address).trim();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided to update',
      });
    }

    if (updates.name !== undefined && updates.name.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters',
      });
    }

    const result = await auth.api.updateUser({
      body: updates,
      headers: req.headers,
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};