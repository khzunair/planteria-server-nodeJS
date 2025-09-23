const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');

// Import your models
const Product = require('./models/Product');
const Transaction = require('./models/Transaction');
const RegisteredVendor = require('./models/RegisteredVendors');
const ProductCategory = require('./models/ProductCategory');
const User = require('./models/User');
const Role = require('./models/Role'); 

const mongoURI = 'mongodb://localhost:27017/planteria';

async function seedDatabase() {
    try {
        await mongoose.connect(mongoURI);
        console.log('Connected to MongoDB.');

        // Clear existing data for a clean start
        console.log('Clearing existing data...');
        await Product.deleteMany({});
        await Transaction.deleteMany({});
        await RegisteredVendor.deleteMany({});
        await ProductCategory.deleteMany({});
        await User.deleteMany({});
        await Role.deleteMany({});

        // Create initial related documents (Roles, Vendors, Categories, Users)
        console.log('Creating initial roles, vendors, categories, and users...');
        const userRole = await Role.create({ name: 'User' });
        const vendorRole = await Role.create({ name: 'Vendor' });

        const hashedPassword = await bcrypt.hash('password123', 10);

        const vendors = [];
        for (let i = 0; i < 50; i++) {
            vendors.push({
                fullName: faker.person.fullName(),
                businessName: faker.company.name(),
                email: faker.internet.email(),
                phone: faker.phone.number('92##########'), 
                address: faker.location.streetAddress(),
                vendorType: faker.helpers.arrayElement(['Individual', 'Small Business', 'Large Supplier']),
                category: faker.helpers.arrayElements(['Plants', 'Seeds', 'Pots', 'Tools'], { min: 1, max: 2 }),
                password: hashedPassword,
                vendorId: `VEND-${faker.string.alphanumeric(8)}`,
                bankDetailsProvided: faker.datatype.boolean(),
                isActive: true,
                isBanned: false,
                lastLogin: faker.date.past(),
            });
        }
        await RegisteredVendor.insertMany(vendors);

        // Generate unique category names using a Set
        console.log('Generating unique product categories...');
        const uniqueCategoryNames = new Set();
        while (uniqueCategoryNames.size < 20) {
            uniqueCategoryNames.add(faker.commerce.department());
        }

        const categories = Array.from(uniqueCategoryNames).map(name => ({ name }));
        await ProductCategory.insertMany(categories);

        const users = [];
        for (let i = 0; i < 100; i++) {
            users.push({
                name: faker.person.fullName(),
                email: faker.internet.email(),
                password: hashedPassword,
                phone: faker.phone.number('92##########'),
                role: userRole._id,
            });
        }
        await User.insertMany(users);

        console.log('Seeding products...');
        const productsToSeed = 100000;
        const products = [];
        const vendorDocs = await RegisteredVendor.find().lean();
        const categoryDocs = await ProductCategory.find().lean();

        for (let i = 0; i < productsToSeed; i++) {
            products.push({
                vendor: vendorDocs[Math.floor(Math.random() * vendorDocs.length)]._id,
                name: faker.commerce.productName(),
                description: faker.commerce.productDescription(),
                price: faker.commerce.price({ min: 10, max: 1000 }),
                discountPrice: faker.number.int({ min: 1, max: 100 }),
                category: categoryDocs[Math.floor(Math.random() * categoryDocs.length)]._id,
                image: faker.image.url(),
                tags: faker.helpers.arrayElements(['organic', 'non-GMO', 'flowering', 'edible'], { min: 1, max: 3 }),
                stock: faker.number.int({ min: 1, max: 500 }),
                weight: faker.number.int({ min: 100, max: 5000 }),
                rating: faker.number.float({ min: 1, max: 5, precision: 0.1 }),
                salesCount: faker.number.int({ min: 0, max: 1000 }),
                isFeatured: faker.datatype.boolean()
            });
        }
        await Product.insertMany(products);
        console.log('Products seeding complete.');

        console.log('Seeding transactions...');
        const transactionsToSeed = 500000;
        const transactions = [];
        const userDocs = await User.find().lean();

        for (let i = 0; i < transactionsToSeed; i++) {
            const randomVendor = vendorDocs[Math.floor(Math.random() * vendorDocs.length)];
            const randomUser = userDocs[Math.floor(Math.random() * userDocs.length)];
            const subtotal = faker.commerce.price({ min: 5, max: 500 });
            const platformFee = subtotal * 0.1; 
            const vendorEarning = subtotal - platformFee;

            transactions.push({
                orderId: new mongoose.Types.ObjectId(),
                vendorId: randomVendor._id,
                userId: randomUser._id,
                subtotal: subtotal,
                platformFee: platformFee,
                vendorEarning: vendorEarning,
                status: faker.helpers.arrayElement(["Pending", "Paid", "Cancelled"]),
                message: faker.lorem.sentence(),
            });
        }
        await Transaction.insertMany(transactions);
        console.log('Transactions seeding complete.');

        console.log('Database seeding finished.💚');
    } catch (error) {
        console.error('Error during database seeding:', error);
    } finally {
        await mongoose.disconnect();
    }
}

seedDatabase();