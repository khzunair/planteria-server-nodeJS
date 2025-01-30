const ProductCategory = require("../../models/ProductCategory");
const { validationResult } = require("express-validator");

// <---------------------Function to add a new category----------------->

const addCategory = async (req, res) => {
  // Validate request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { categoryName } = req.body;

  try {
    // Convert the category name to uppercase
    const upperCaseCategoryName = categoryName.toUpperCase();

    // Check if the category already exists (case-insensitive search)
    const existingCategory = await ProductCategory.findOne({
      name: upperCaseCategoryName,
    });

    if (existingCategory) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Category already exists" }] });
    }

    // Create a new category with the uppercase name
    const newCategory = new ProductCategory({
      name: upperCaseCategoryName,
    });

    // Save the category to the database
    await newCategory.save();

    // Return success response
    res.status(201).json({ msg: "Category added successfully" });
  } catch (err) {
    console.error("Error adding category:", err.message);
    res.status(500).send("Server Error");
  }
};

// <----------------------Get all product categories ---------------->
const getAllProductCategories = async (req, res) => {
  try {
    // Fetch all categories from the database
    const categories = await ProductCategory.find();

    // If no categories found
    if (!categories || categories.length === 0) {
      return res.status(404).json({ msg: "No categories found" });
    }

    // Send categories in the response
    res.status(200).json({ categories });
  } catch (err) {
    console.error("Error fetching categories:", err.message);
    res.status(500).send("Server Error");
  }
};

//<---------------Delete Product Category---------------------->

const deleteProductCategory = async (req, res) => {
  const { id } = req.params;

  try {
    // Find the category by its ID
    const category = await ProductCategory.findById(id);

    // If category not found, return an error
    if (!category) {
      return res.status(404).json({ msg: "Category not found" });
    }

    // Store the category name to include in the success message
    const categoryName = category.name;

    // Delete the category
    await ProductCategory.findByIdAndDelete(id);

    // Return success response with category name
    res
      .status(200)
      .json({ msg: `${categoryName} category deleted successfully` });
  } catch (err) {
    console.error("Error deleting category:", err.message);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  addCategory,
  getAllProductCategories,
  deleteProductCategory,
};
