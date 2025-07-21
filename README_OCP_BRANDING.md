# Branding OCP Group - Intégration

## 🏢 **Branding Ajouté**

L'application FX Risk Manager a été mise à jour pour inclure le branding **OCP Group - Corporate Performance Management**.

## 📍 **Emplacements du Branding**

### 1. **Sidebar (Navigation principale)**
- **Fichier** : `src/components/AppSidebar.tsx`
- **Emplacement** : Header de la sidebar
- **Contenu** :
  - Logo OCP Group (image)
  - Nom "OCP Group"
  - Sous-titre "Corporate Performance Management"
  - Titre application "FX Risk Manager"

### 2. **Header Principal**
- **Fichier** : `src/components/Layout.tsx`
- **Emplacement** : Coin supérieur droit du header
- **Contenu** :
  - Logo OCP Group (petite taille)
  - Texte "OCP Group | Corporate Performance Management"
  - Visible uniquement sur écrans larges (lg+)

### 3. **Titre HTML**
- **Fichier** : `index.html`
- **Contenu** :
  - Titre : "FX Risk Manager | OCP Group - Corporate Performance Management"
  - Description : "Currency Hedging Platform - OCP Group Corporate Performance Management"
  - Auteur : "OCP Group"

## 🖼️ **Logo à Ajouter**

### **Instructions pour le Logo** :

1. **Nom du fichier** : `ocp-logo.png`
2. **Emplacement** : `public/ocp-logo.png`
3. **Format recommandé** :
   - Format : PNG avec transparence
   - Taille : 512x512 pixels (ou ratio carré)
   - Fond : Transparent
   - Style : Logo propre et professionnel

### **Gestion des Erreurs** :
- Si le logo n'est pas trouvé, l'application utilise l'icône Globe par défaut
- Le système est robuste et ne cassera pas sans le logo

## 🎨 **Styles Appliqués**

### **Sidebar Logo** :
```css
- Taille : 40x40px (h-10 w-10)
- Container : 48x48px (h-12 w-12)
- Style : object-contain (préserve les proportions)
- Background : Primary/10 avec bordure
```

### **Header Logo** :
```css
- Taille : 24x24px (h-6 w-6)
- Style : object-contain
- Opacité : 70% (opacity-70)
- Masqué automatiquement sur mobile
```

## 📱 **Responsive Design**

- **Mobile/Tablet** : Seul le logo de la sidebar est visible
- **Desktop** : Logo dans sidebar + branding complet dans header
- **Large screens** : Branding complet visible partout

## 🔧 **Code Implémenté**

### **AppSidebar.tsx** :
```tsx
<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
  <img 
    src="/ocp-logo.png" 
    alt="OCP Group Logo" 
    className="h-10 w-10 object-contain"
    onError={(e) => {
      e.currentTarget.style.display = 'none';
      e.currentTarget.nextElementSibling?.classList.remove('hidden');
    }}
  />
  <Globe className="h-6 w-6 text-primary hidden" />
</div>
<div className="flex-1">
  <div className="text-sm font-bold text-primary mb-1">OCP Group</div>
  <div className="text-xs text-muted-foreground mb-2">Corporate Performance Management</div>
  <h2 className="text-lg font-bold text-foreground">FX Risk Manager</h2>
  <p className="text-sm text-muted-foreground">Currency Hedging Platform</p>
</div>
```

### **Layout.tsx** :
```tsx
<div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
  <img 
    src="/ocp-logo.png" 
    alt="OCP Group" 
    className="h-6 w-6 object-contain opacity-70"
    onError={(e) => e.currentTarget.style.display = 'none'}
  />
  <span className="font-medium">OCP Group | Corporate Performance Management</span>
</div>
```

## ✅ **Résultat Final**

1. **Branding professionnel** intégré dans toute l'application
2. **Logo OCP Group** visible dans la navigation
3. **Nom complet** affiché de manière élégante
4. **Fallback robuste** en cas d'absence du logo
5. **Design responsive** adapté à tous les écrans

---

**Next Step** : Ajouter le fichier `ocp-logo.png` dans le dossier `public/` pour finaliser l'intégration du branding. 