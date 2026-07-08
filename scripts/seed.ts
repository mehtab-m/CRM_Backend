/**
 * Seeds a demo business with 20 realistic customers plus synchronized
 * products, categories, conversations/messages, and orders — replacing the
 * old hardcoded frontend dummy data with real DB rows.
 *
 * Run: npm run seed:demo
 * Requires DATABASE_URL and JWT_SECRET in .env
 *
 * Idempotent: wipes and re-inserts everything for the fixed demo business only.
 */
import { eq } from 'drizzle-orm';
import { db, pool } from '../src/db/client.js';
import {
  businesses,
  categories,
  conversations,
  customers,
  messages,
  orderItems,
  orders,
  products,
  users,
} from '../src/db/schema/index.js';
import type { CustomerTier, OrderStatus, ConversationStatus, SenderType } from '../src/db/schema/index.js';
import { hashPassword } from '../src/lib/password.js';

// Fixed IDs make the seed idempotent.
const DEMO_BUSINESS_ID = '11111111-1111-1111-1111-111111111111';
const DEMO_BUSINESS_NAME = 'Epicar Demo Store';
const DEMO_EMAIL = 'demo@epicar.app';
const DEMO_PASSWORD = 'Demo12345!';
const DEMO_FULL_NAME = 'Demo Owner';

const now = new Date();
const daysAgo = (d: number): Date => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
const hoursAgo = (h: number): Date => new Date(now.getTime() - h * 60 * 60 * 1000);
const minutesAgo = (m: number): Date => new Date(now.getTime() - m * 60 * 1000);

const CATEGORY_NAMES = ['Phones', 'Laptops', 'Audio', 'Tablets', 'TVs'];

interface ProductSeed {
  key: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

const PRODUCTS: ProductSeed[] = [
  { key: 'iphone15pro', name: 'iPhone 15 Pro', category: 'Phones', price: 129999, stock: 25 },
  { key: 's24ultra', name: 'Samsung Galaxy S24 Ultra', category: 'Phones', price: 119999, stock: 18 },
  { key: 'pixel8', name: 'Google Pixel 8', category: 'Phones', price: 84999, stock: 12 },
  { key: 'macbookpro14', name: 'MacBook Pro 14"', category: 'Laptops', price: 289000, stock: 10 },
  { key: 'dellxps13', name: 'Dell XPS 13', category: 'Laptops', price: 185000, stock: 14 },
  { key: 'airpodspro', name: 'AirPods Pro 2', category: 'Audio', price: 24900, stock: 40 },
  { key: 'sonyxm5', name: 'Sony WH-1000XM5', category: 'Audio', price: 89900, stock: 15 },
  { key: 'ipadair', name: 'iPad Air', category: 'Tablets', price: 89900, stock: 20 },
  { key: 'galaxytab', name: 'Samsung Galaxy Tab S9', category: 'Tablets', price: 79900, stock: 0 },
  { key: 'qled55', name: 'Samsung 55" QLED TV', category: 'TVs', price: 145000, stock: 8 },
  { key: 'lgoled65', name: 'LG OLED 65" TV', category: 'TVs', price: 320000, stock: 5 },
];

interface CustomerSeed {
  name: string;
  phone: string;
  email: string;
  city: string;
  tier: CustomerTier;
}

const CUSTOMERS: CustomerSeed[] = [
  { name: 'Ahmed Raza', phone: '+92 300 1234567', email: 'ahmed.raza@example.com', city: 'Karachi', tier: 'vip' },
  { name: 'Fatima Khan', phone: '+92 301 2345678', email: 'fatima.khan@example.com', city: 'Lahore', tier: 'regular' },
  { name: 'Bilal Ahmed', phone: '+92 302 3456789', email: 'bilal.ahmed@example.com', city: 'Islamabad', tier: 'vip' },
  { name: 'Ayesha Malik', phone: '+92 303 4567890', email: 'ayesha.malik@example.com', city: 'Rawalpindi', tier: 'regular' },
  { name: 'Usman Tariq', phone: '+92 304 5678901', email: 'usman.tariq@example.com', city: 'Faisalabad', tier: 'new' },
  { name: 'Zainab Hussain', phone: '+92 305 6789012', email: 'zainab.hussain@example.com', city: 'Multan', tier: 'regular' },
  { name: 'Hamza Sheikh', phone: '+92 306 7890123', email: 'hamza.sheikh@example.com', city: 'Peshawar', tier: 'vip' },
  { name: 'Sana Javed', phone: '+92 307 8901234', email: 'sana.javed@example.com', city: 'Quetta', tier: 'new' },
  { name: 'Ali Hassan', phone: '+92 308 9012345', email: 'ali.hassan@example.com', city: 'Hyderabad', tier: 'regular' },
  { name: 'Mariam Nawaz', phone: '+92 309 0123456', email: 'mariam.nawaz@example.com', city: 'Sialkot', tier: 'regular' },
  { name: 'Omar Farooq', phone: '+92 310 1122334', email: 'omar.farooq@example.com', city: 'Gujranwala', tier: 'new' },
  { name: 'Hina Rashid', phone: '+92 311 2233445', email: 'hina.rashid@example.com', city: 'Bahawalpur', tier: 'regular' },
  { name: 'Kamran Akmal', phone: '+92 312 3344556', email: 'kamran.akmal@example.com', city: 'Sargodha', tier: 'vip' },
  { name: 'Nadia Ali', phone: '+92 313 4455667', email: 'nadia.ali@example.com', city: 'Sukkur', tier: 'new' },
  { name: 'Faisal Iqbal', phone: '+92 314 5566778', email: 'faisal.iqbal@example.com', city: 'Larkana', tier: 'regular' },
  { name: 'Rabia Anwar', phone: '+92 315 6677889', email: 'rabia.anwar@example.com', city: 'Abbottabad', tier: 'new' },
  { name: 'Shahid Afridi', phone: '+92 316 7788990', email: 'shahid.afridi@example.com', city: 'Mardan', tier: 'vip' },
  { name: 'Komal Rana', phone: '+92 317 8899001', email: 'komal.rana@example.com', city: 'Sahiwal', tier: 'regular' },
  { name: 'Tariq Mehmood', phone: '+92 318 9900112', email: 'tariq.mehmood@example.com', city: 'Okara', tier: 'new' },
  { name: 'Sadia Imam', phone: '+92 319 0011223', email: 'sadia.imam@example.com', city: 'Wah Cantt', tier: 'regular' },
];

interface ConversationSeed {
  customerIndex: number;
  status: ConversationStatus;
  unreadCount: number;
  lastMessageAt: Date;
  thread: { from: SenderType; text: string; at: Date }[];
}

const CONVERSATIONS: ConversationSeed[] = [
  {
    customerIndex: 0,
    status: 'active',
    unreadCount: 3,
    lastMessageAt: minutesAgo(2),
    thread: [
      { from: 'customer', text: 'Hi, do you have the iPhone 15 Pro in stock?', at: minutesAgo(30) },
      { from: 'agent', text: 'Yes! We have it available in all colors. Would you like to place an order?', at: minutesAgo(25) },
      { from: 'customer', text: 'What is the price?', at: minutesAgo(6) },
      { from: 'customer', text: 'And do you deliver to Karachi?', at: minutesAgo(4) },
      { from: 'customer', text: 'Please reply, I want to buy today.', at: minutesAgo(2) },
    ],
  },
  {
    customerIndex: 1,
    status: 'active',
    unreadCount: 1,
    lastMessageAt: minutesAgo(15),
    thread: [
      { from: 'customer', text: 'When will my order be delivered?', at: hoursAgo(3) },
      { from: 'agent', text: 'Your order has been dispatched and will arrive within 2 days.', at: hoursAgo(2) },
      { from: 'customer', text: 'Can I get a tracking number?', at: minutesAgo(15) },
    ],
  },
  {
    customerIndex: 2,
    status: 'resolved',
    unreadCount: 0,
    lastMessageAt: hoursAgo(1),
    thread: [
      { from: 'customer', text: 'Thanks, I received my MacBook. Great service!', at: hoursAgo(2) },
      { from: 'agent', text: 'Thank you for shopping with us! Enjoy your new MacBook.', at: hoursAgo(1) },
    ],
  },
  {
    customerIndex: 3,
    status: 'active',
    unreadCount: 2,
    lastMessageAt: hoursAgo(2),
    thread: [
      { from: 'customer', text: 'I want to place an order for AirPods Pro.', at: hoursAgo(5) },
      { from: 'agent', text: 'Sure! They are priced at PKR 24,900. Shall I confirm the order?', at: hoursAgo(4) },
      { from: 'customer', text: 'Yes please, deliver to Rawalpindi.', at: hoursAgo(2) },
      { from: 'customer', text: 'Also, is cash on delivery available?', at: hoursAgo(2) },
    ],
  },
  {
    customerIndex: 4,
    status: 'pending',
    unreadCount: 0,
    lastMessageAt: hoursAgo(4),
    thread: [
      { from: 'customer', text: 'What are the prices for your laptops?', at: hoursAgo(5) },
      { from: 'agent', text: 'Our Dell XPS 13 is PKR 185,000 and MacBook Pro 14" is PKR 289,000.', at: hoursAgo(4) },
    ],
  },
  {
    customerIndex: 6,
    status: 'active',
    unreadCount: 4,
    lastMessageAt: minutesAgo(45),
    thread: [
      { from: 'customer', text: 'Salam, I need a gaming laptop.', at: hoursAgo(6) },
      { from: 'agent', text: 'We recommend the Dell XPS 13 for performance. Interested?', at: hoursAgo(5) },
      { from: 'customer', text: 'Does it come with warranty?', at: minutesAgo(50) },
      { from: 'customer', text: 'And what about EMI options?', at: minutesAgo(48) },
      { from: 'customer', text: 'Please share details.', at: minutesAgo(46) },
      { from: 'customer', text: 'Waiting for your reply.', at: minutesAgo(45) },
    ],
  },
  {
    customerIndex: 8,
    status: 'pending',
    unreadCount: 1,
    lastMessageAt: hoursAgo(8),
    thread: [
      { from: 'customer', text: 'Is the Samsung QLED TV available?', at: hoursAgo(9) },
      { from: 'agent', text: 'Yes, the 55" QLED is in stock at PKR 145,000.', at: hoursAgo(8) },
      { from: 'customer', text: 'Great, can you hold one for me?', at: hoursAgo(8) },
    ],
  },
  {
    customerIndex: 9,
    status: 'resolved',
    unreadCount: 0,
    lastMessageAt: daysAgo(1),
    thread: [
      { from: 'customer', text: 'Order received, thank you!', at: daysAgo(1) },
      { from: 'agent', text: 'You are most welcome. Have a great day!', at: daysAgo(1) },
    ],
  },
  {
    customerIndex: 12,
    status: 'active',
    unreadCount: 2,
    lastMessageAt: minutesAgo(20),
    thread: [
      { from: 'customer', text: 'Do you have the Sony XM5 headphones?', at: hoursAgo(1) },
      { from: 'agent', text: 'Yes, they are available at PKR 89,900.', at: minutesAgo(40) },
      { from: 'customer', text: 'Any discount for bulk order?', at: minutesAgo(22) },
      { from: 'customer', text: 'I need 3 units.', at: minutesAgo(20) },
    ],
  },
  {
    customerIndex: 16,
    status: 'active',
    unreadCount: 1,
    lastMessageAt: minutesAgo(5),
    thread: [
      { from: 'customer', text: 'Hello, I want to buy an iPad Air.', at: minutesAgo(12) },
      { from: 'agent', text: 'Great choice! It is PKR 89,900. Shall I place the order?', at: minutesAgo(8) },
      { from: 'customer', text: 'Yes, please proceed.', at: minutesAgo(5) },
    ],
  },
];

interface OrderSeed {
  customerIndex: number;
  items: { productKey: string; qty: number }[];
  status: OrderStatus;
  daysAgo: number;
  address: string;
  city: string;
}

const ORDERS: OrderSeed[] = [
  { customerIndex: 0, items: [{ productKey: 'iphone15pro', qty: 1 }], status: 'new', daysAgo: 0, address: 'House 12, Block 6, PECHS', city: 'Karachi' },
  { customerIndex: 1, items: [{ productKey: 'qled55', qty: 1 }], status: 'confirmed', daysAgo: 1, address: 'Flat 8, Garden Town', city: 'Lahore' },
  { customerIndex: 2, items: [{ productKey: 'macbookpro14', qty: 1 }], status: 'delivered', daysAgo: 6, address: 'Plot 90, F-7 Markaz', city: 'Islamabad' },
  { customerIndex: 3, items: [{ productKey: 'airpodspro', qty: 2 }], status: 'dispatched', daysAgo: 2, address: 'House 234, Satellite Town', city: 'Rawalpindi' },
  { customerIndex: 4, items: [{ productKey: 'dellxps13', qty: 1 }], status: 'new', daysAgo: 5, address: 'Street 4, Peoples Colony', city: 'Faisalabad' },
  { customerIndex: 5, items: [{ productKey: 'ipadair', qty: 1 }, { productKey: 'airpodspro', qty: 1 }], status: 'confirmed', daysAgo: 4, address: 'Shop 12, Cantt Bazaar', city: 'Multan' },
  { customerIndex: 6, items: [{ productKey: 's24ultra', qty: 1 }], status: 'new', daysAgo: 7, address: 'University Road, Block C', city: 'Peshawar' },
  { customerIndex: 8, items: [{ productKey: 'sonyxm5', qty: 1 }], status: 'dispatched', daysAgo: 3, address: 'Latifabad Unit 7', city: 'Hyderabad' },
  { customerIndex: 9, items: [{ productKey: 'pixel8', qty: 1 }], status: 'delivered', daysAgo: 8, address: 'Kashmir Road', city: 'Sialkot' },
  { customerIndex: 10, items: [{ productKey: 'galaxytab', qty: 1 }], status: 'new', daysAgo: 4, address: 'Model Town, Block A', city: 'Gujranwala' },
  { customerIndex: 12, items: [{ productKey: 'lgoled65', qty: 1 }], status: 'confirmed', daysAgo: 0, address: 'Satellite Town, Block D', city: 'Sargodha' },
  { customerIndex: 14, items: [{ productKey: 'iphone15pro', qty: 1 }, { productKey: 'airpodspro', qty: 1 }], status: 'dispatched', daysAgo: 2, address: 'Station Road', city: 'Larkana' },
  { customerIndex: 16, items: [{ productKey: 'ipadair', qty: 1 }], status: 'new', daysAgo: 0, address: 'Nishtarabad', city: 'Mardan' },
  { customerIndex: 17, items: [{ productKey: 'sonyxm5', qty: 2 }], status: 'confirmed', daysAgo: 5, address: 'Farid Town', city: 'Sahiwal' },
  { customerIndex: 19, items: [{ productKey: 'dellxps13', qty: 1 }], status: 'delivered', daysAgo: 9, address: 'GT Road, Wah Cantt', city: 'Wah Cantt' },
];

async function main(): Promise<void> {
  console.log('Seeding demo business...');

  // 1. Business + owner login (idempotent).
  await db
    .insert(businesses)
    .values({ id: DEMO_BUSINESS_ID, name: DEMO_BUSINESS_NAME })
    .onConflictDoUpdate({ target: businesses.id, set: { name: DEMO_BUSINESS_NAME } });

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  await db
    .insert(users)
    .values({
      email: DEMO_EMAIL,
      passwordHash,
      fullName: DEMO_FULL_NAME,
      role: 'business_owner',
      businessId: DEMO_BUSINESS_ID,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        passwordHash,
        fullName: DEMO_FULL_NAME,
        role: 'business_owner',
        businessId: DEMO_BUSINESS_ID,
        isActive: true,
      },
    });

  // 2. Wipe existing demo data (children first via cascades).
  await db.delete(orders).where(eq(orders.businessId, DEMO_BUSINESS_ID)); // cascades order_items
  await db.delete(conversations).where(eq(conversations.businessId, DEMO_BUSINESS_ID)); // cascades messages
  await db.delete(products).where(eq(products.businessId, DEMO_BUSINESS_ID));
  await db.delete(categories).where(eq(categories.businessId, DEMO_BUSINESS_ID));
  await db.delete(customers).where(eq(customers.businessId, DEMO_BUSINESS_ID));

  // 3. Categories.
  await db
    .insert(categories)
    .values(CATEGORY_NAMES.map((name) => ({ businessId: DEMO_BUSINESS_ID, name })));

  // 4. Products.
  const insertedProducts = await db
    .insert(products)
    .values(
      PRODUCTS.map((p) => ({
        businessId: DEMO_BUSINESS_ID,
        name: p.name,
        category: p.category,
        price: p.price,
        stock: p.stock,
        status: (p.stock > 0 ? 'active' : 'out_of_stock') as 'active' | 'out_of_stock',
      })),
    )
    .returning();
  const productByKey = new Map<string, { id: string; name: string; price: number }>();
  PRODUCTS.forEach((p, i) => {
    productByKey.set(p.key, { id: insertedProducts[i].id, name: p.name, price: p.price });
  });

  // 5. Customers.
  const insertedCustomers = await db
    .insert(customers)
    .values(
      CUSTOMERS.map((c) => ({
        businessId: DEMO_BUSINESS_ID,
        phoneNumber: c.phone,
        name: c.name,
        email: c.email,
        city: c.city,
        tier: c.tier,
      })),
    )
    .returning();

  // 6. Conversations + messages.
  let messageCount = 0;
  for (const conv of CONVERSATIONS) {
    const customer = insertedCustomers[conv.customerIndex];
    const [row] = await db
      .insert(conversations)
      .values({
        businessId: DEMO_BUSINESS_ID,
        customerId: customer.id,
        status: conv.status,
        unreadCount: conv.unreadCount,
        lastMessageAt: conv.lastMessageAt,
      })
      .returning();

    await db.insert(messages).values(
      conv.thread.map((m) => ({
        conversationId: row.id,
        senderType: m.from,
        content: m.text,
        isCustomReply: m.from === 'agent',
        createdAt: m.at,
      })),
    );
    messageCount += conv.thread.length;
  }

  // 7. Orders + order items.
  for (const ord of ORDERS) {
    const customer = insertedCustomers[ord.customerIndex];
    const items = ord.items.map((item) => {
      const product = productByKey.get(item.productKey)!;
      return { product, qty: item.qty };
    });
    const total = items.reduce((sum, it) => sum + it.product.price * it.qty, 0);
    const createdAt = daysAgo(ord.daysAgo);

    const [order] = await db
      .insert(orders)
      .values({
        businessId: DEMO_BUSINESS_ID,
        customerId: customer.id,
        status: ord.status,
        totalAmount: total.toFixed(2),
        deliveryAddress: ord.address,
        city: ord.city,
        createdAt,
        updatedAt: createdAt,
      })
      .returning();

    await db.insert(orderItems).values(
      items.map((it) => ({
        orderId: order.id,
        productId: it.product.id,
        productName: it.product.name,
        qty: it.qty,
        price: it.product.price.toFixed(2),
      })),
    );
  }

  console.log('---------------------------------------------');
  console.log('Demo seed complete.');
  console.log(`Business:      ${DEMO_BUSINESS_NAME}`);
  console.log(`Categories:    ${CATEGORY_NAMES.length}`);
  console.log(`Products:      ${insertedProducts.length}`);
  console.log(`Customers:     ${insertedCustomers.length}`);
  console.log(`Conversations: ${CONVERSATIONS.length} (${messageCount} messages)`);
  console.log(`Orders:        ${ORDERS.length}`);
  console.log('---------------------------------------------');
  console.log('Login to the CRM with:');
  console.log(`  Email:    ${DEMO_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
  console.log('---------------------------------------------');
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
