import Product from '../models/product.model.js';
import { toCSV } from '../utils/csv.js';
// -----------------------------------------------
// GET /api/products
// Public — anyone can fetch products
// Supports filtering by category, stockStatus
// Supports search by name
// Supports pagination
// -----------------------------------------------
export const getAllProducts = async (req, res) => {
  try {
    const {
      category,
      stockStatus,
      search,
      visible,
      sku,
      page  = 1,
      limit = 12,
    } = req.query;

    // Build filter object dynamically
    const filter = {};

    if (category)    filter.category    = category;
    if (stockStatus) filter.stockStatus = stockStatus;

    // Search by name — case insensitive
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    if (sku)filter.sku         = sku.toUpperCase(); 
    // Storefront only sees visible products
    // Admin can see all including drafts
    if (visible === 'true')  filter.visible = true;
    if (visible === 'false') filter.visible = false;

    // Pagination
    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success:  true,
      products,
      pagination: {
        total,
        page:       Number(page),
        limit:      Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// -----------------------------------------------
// GET /api/products/:id
// Public — anyone can fetch a single product
// -----------------------------------------------
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// -----------------------------------------------
// POST /api/products
// Admin only
// -----------------------------------------------

export const exportProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

    const columns = [
      { label: 'Name',         value: (p) => p.name },
      { label: 'SKU',          value: (p) => p.sku },
      { label: 'Category',     value: (p) => p.category },
      { label: 'Price',        value: (p) => p.price },
      { label: 'Total Stock',  value: (p) => p.totalStock },
      { label: 'Stock Status', value: (p) => p.stockStatus },
      { label: 'Visible',      value: (p) => (p.visible ? 'Yes' : 'No') },
      { label: 'Created At',   value: (p) => p.createdAt?.toISOString() || '' },
    ];

    const csv = toCSV(products, columns);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="ferrum-products-${Date.now()}.csv"`);
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      sku,
      price,
      images,
      sizes,
      visible,
    } = req.body;

    // Check for duplicate SKU before attempting save
    // Gives a cleaner error than MongoDB's duplicate key error
    const existing = await Product.findOne({ sku: sku.toUpperCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `SKU ${sku.toUpperCase()} already exists`,
      });
    }

    const product = await Product.create({
      name,
      description,
      category,
      sku,
      price,
      images,
      sizes,
      visible: visible ?? false,
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product,
    });
  } catch (err) {
    // Handle mongoose validation errors cleanly
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// -----------------------------------------------
// PUT /api/products/:id
// Admin only
// -----------------------------------------------
export const updateProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      sku,
      price,
      images,
      sizes,
      visible,
    } = req.body;

    // If SKU is being changed, check it doesn't
    // conflict with another product
    if (sku) {
      const existing = await Product.findOne({
        sku:  sku.toUpperCase(),
        _id:  { $ne: req.params.id }, // exclude current product
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: `SKU ${sku.toUpperCase()} already exists`,
        });
      }
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        category,
        sku,
        price,
        images,
        sizes,
        visible,
      },
      {
        new:          true,  // return updated document
        runValidators: true, // run schema validators on update
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product,
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// -----------------------------------------------
// DELETE /api/products/:id
// Admin only
// -----------------------------------------------
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// -----------------------------------------------
// PATCH /api/products/:id/visibility
// Admin only — toggle product visible/draft
// -----------------------------------------------
export const toggleVisibility = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    product.visible = !product.visible;
    await product.save();

    res.status(200).json({
      success: true,
      message: `Product is now ${product.visible ? 'visible' : 'draft'}`,
      visible: product.visible,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};