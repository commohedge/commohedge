# 🔐 Login Credentials - FX hedging Risk Management Platform

## **Default Login Credentials**

For accessing the FX hedging Risk Management Platform dashboard:

### 📧 **Email:**
```
commohedge@test.com
```

### 🔑 **Password:**
```
test
```

---

## 🌐 **Access URLs**

### **Landing Page (Public):**
- **URL:** http://localhost:8070/
- **Purpose:** Public landing page with product information
- **Features:** Product showcase, testimonials, FAQ

### **Application Dashboard (Requires Login):**
- **URL:** http://localhost:8070/dashboard
- **Purpose:** Main application interface
- **Access:** Click "Login" button from landing page or navigate directly

---

## 🔄 **User Flow**

### **New Visitors:**
1. **Start at:** http://localhost:8070/ (Landing Page)
2. **Click:** "Login" button in navigation
3. **Redirected to:** http://localhost:8070/dashboard
4. **Login with:** commohedge@test.com / test

### **Direct Access:**
1. **Navigate to:** http://localhost:8070/dashboard
2. **Login with:** commohedge@test.com / test

---

## 🔧 **Navigation Changes Made**

### **Before:**
- Button text: "View App"
- Purpose: Generic app access

### **After:**
- Button text: "Login"
- Purpose: Clear authentication action
- Maintains same URL: `/dashboard`

### **Updated Components:**
- ✅ **Desktop navigation** - LandingNav.tsx (line 68)
- ✅ **Mobile navigation** - LandingNav.tsx (line 113)

---

## 💼 **For Development/Testing**

These credentials provide access to the full FX Risk Management Platform including:

- 📊 **Executive Risk Dashboard** - VaR, hedge ratios, alerts
- 🧮 **Advanced Pricing Engine** - Garman-Kohlhagen models, Monte Carlo
- 🌍 **Forex Market Data** - 150+ currency pairs, real-time screeners
- 📈 **Strategy Builder** - Barriers, digitals, zero-cost strategies
- 📋 **Reports & Analytics** - Performance tracking, compliance reports

---

## 🔒 **Security Note**

These are **default test credentials** for development purposes. In production:
- Use secure authentication system
- Implement proper user management
- Enable multi-factor authentication
- Use encrypted password storage

**Test Account:** commohedge@test.com / test
