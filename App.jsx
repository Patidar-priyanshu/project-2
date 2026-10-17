import { useState, useRef, useEffect } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import Tesseract from 'tesseract.js'
import {
  EXACT_INDIAN_BARCODES,
  INDIAN_BRAND_FALLBACKS,
  CATEGORY_ALTERNATIVES,
} from './indianFoodsData'
import './App.css'

const initialDefaultProducts = [
  {
    name: "Lay's American Style Cream & Onion Potato Chips",
    category: 'Potato Chips',
    score: '3.5',
    sugar: '4.2 g',
    calories: '544 kcal',
    fat: '33.8 g',
    reason: 'Deep-fried potato chips with sour cream seasoning and high saturated fats.',
    color: 'yellow',
    icon: '🥔',
  },
  {
    name: 'Britannia Marie Gold Biscuits (120g)',
    category: 'Biscuits',
    score: '4.5',
    sugar: '21.5 g',
    calories: '446 kcal',
    fat: '10.5 g',
    reason: 'Lower fat than standard cookies, but contains 21.5g sugar per 100g.',
    color: 'yellow',
    icon: '🍪',
  },
  {
    name: 'Maggi 2-Minute Masala Noodles (70g)',
    category: 'Instant Noodles',
    score: '6.6',
    sugar: '1.8 g',
    calories: '384 kcal',
    fat: '12.5 g',
    reason: 'Refined maida noodle cake deep-fried with palm oil.',
    color: 'yellow',
    icon: '🍜',
  },
]

// Strict Category Classifier: Potato Chips checked FIRST so Cream & Onion NEVER hits biscuits
function getAccurateCategory(product) {
  if (!product) return 'Potato Chips'
  const name = (product.name || '').toLowerCase()
  const cat = (product.category || '').toLowerCase()
  const text = `${name} ${cat}`

  // 1. POTATO CHIPS & CRISPS (Prioritized over everything)
  if (
    text.includes('chip') ||
    text.includes('crisp') ||
    text.includes('potato') ||
    text.includes('wafer') ||
    text.includes('lays') ||
    text.includes("lay's") ||
    text.includes('kurkure') ||
    text.includes('dorito') ||
    text.includes('nacho') ||
    text.includes('tedhe medhe') ||
    text.includes('mad angles') ||
    text.includes('cream & onion') ||
    text.includes('cream and onion') ||
    text.includes('sour cream') ||
    text.includes('pringles')
  ) {
    return 'Potato Chips'
  }

  // 2. INSTANT NOODLES & PASTA
  if (
    text.includes('noodle') ||
    text.includes('maggi') ||
    text.includes('yippee') ||
    text.includes('ramen') ||
    text.includes('pasta') ||
    text.includes('macaroni') ||
    text.includes('vermicelli') ||
    text.includes('chowmein')
  ) {
    return 'Instant Noodles'
  }

  // 3. TRADITIONAL NAMKEEN & SAVORY
  if (
    text.includes('bhujia') ||
    text.includes('sev') ||
    text.includes('namkeen') ||
    text.includes('mixture') ||
    text.includes('chana jor') ||
    text.includes('moong dal') ||
    text.includes('gathiya') ||
    text.includes('haldiram') ||
    text.includes('bikaji')
  ) {
    return 'Namkeen'
  }

  // 4. BISCUITS & COOKIES (Strict bakery terms only)
  if (
    text.includes('biscuit') ||
    text.includes('cookie') ||
    text.includes('marie') ||
    text.includes('cracker') ||
    text.includes('rusk') ||
    text.includes('parle-g') ||
    text.includes('parleg') ||
    text.includes('bourbon') ||
    text.includes('good day') ||
    text.includes('monaco') ||
    text.includes('krackjack') ||
    text.includes('oreo') ||
    text.includes('digestive') ||
    text.includes('bakery')
  ) {
    return 'Biscuits'
  }

  // 5. CHOCOLATE & CONFECTIONERY
  if (
    text.includes('chocolate') ||
    text.includes('cocoa') ||
    text.includes('candy') ||
    text.includes('dairy milk') ||
    text.includes('kitkat') ||
    text.includes('perk') ||
    text.includes('5 star') ||
    text.includes('cadbury')
  ) {
    return 'Chocolate'
  }

  // 6. BEVERAGES & DRINKS
  if (
    text.includes('drink') ||
    text.includes('juice') ||
    text.includes('cola') ||
    text.includes('soda') ||
    text.includes('frooti') ||
    text.includes('pepsi') ||
    text.includes('coke') ||
    text.includes('thums up') ||
    text.includes('sprite') ||
    text.includes('beverage')
  ) {
    return 'Beverages'
  }

  // 7. CEREALS & OATS
  if (
    text.includes('cereal') ||
    text.includes('corn flake') ||
    text.includes('cornflakes') ||
    text.includes('muesli') ||
    text.includes('oats') ||
    text.includes('chocos')
  ) {
    return 'Cereals'
  }

  // 8. DAIRY
  if (
    text.includes('butter') ||
    text.includes('cheese') ||
    text.includes('paneer') ||
    text.includes('curd') ||
    text.includes('dahi')
  ) {
    return 'Dairy'
  }

  return 'Potato Chips'
}

function App() {
  // Persistent local scan history
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem('food_scan_history')
      return saved ? JSON.parse(saved) : initialDefaultProducts
    } catch (e) {
      return initialDefaultProducts
    }
  })

  const [search, setSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [scanStatus, setScanStatus] = useState('')
  const [scannerMode, setScannerMode] = useState('barcode')

  // Manual input form state
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('Potato Chips')
  const [formCalories, setFormCalories] = useState('')
  const [formSugar, setFormSugar] = useState('')
  const [formFat, setFormFat] = useState('')

  const reportRef = useRef(null)
  const productsSectionRef = useRef(null)
  const scannerInstanceRef = useRef(null)
  const fileInputRef = useRef(null)
  const labelInputRef = useRef(null)

  // Auto-sync products to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('food_scan_history', JSON.stringify(products))
    } catch (e) {
      console.error('Failed writing to localStorage:', e)
    }
  }, [products])

  useEffect(() => {
    if (selectedProduct && reportRef.current) {
      reportRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedProduct])

  useEffect(() => {
    return () => {
      if (scannerInstanceRef.current && scannerInstanceRef.current.isScanning) {
        scannerInstanceRef.current.stop().catch(() => {})
      }
    }
  }, [])

  const handleClearHistory = () => {
    if (window.confirm('Clear all saved product scan history?')) {
      setProducts([])
      localStorage.removeItem('food_scan_history')
      setSelectedProduct(null)
    }
  }

  // --- OCR Nutrition Label Parser ---
  const parseNutritionText = (text) => {
    const clean = text.toLowerCase().replace(/,/g, '.')

    let calories = 0
    const calMatch = clean.match(/(?:energy|calories|kcal)[\s\:\-\_]*([0-9]+(?:\.[0-9]+)?)/i)
    if (calMatch) calories = parseFloat(calMatch[1])

    let sugar = 0
    const sugarMatch = clean.match(/(?:sugars?|total sugars?|added sugars?)[\s\:\-\_]*([0-9]+(?:\.[0-9]+)?)/i)
    if (sugarMatch) sugar = parseFloat(sugarMatch[1])

    let fat = 0
    const fatMatch = clean.match(/(?:total fat|fat|lipids)[\s\:\-\_]*([0-9]+(?:\.[0-9]+)?)/i)
    if (fatMatch) fat = parseFloat(fatMatch[1])

    let guessedCategory = 'Potato Chips'
    if (clean.includes('potato') || clean.includes('chips') || clean.includes('sour cream') || clean.includes('onion')) {
      guessedCategory = 'Potato Chips'
    } else if (clean.includes('noodle') || clean.includes('tastemaker')) {
      guessedCategory = 'Instant Noodles'
    } else if (clean.includes('biscuit') || clean.includes('cookie') || clean.includes('bakery')) {
      guessedCategory = 'Biscuits'
    } else if (clean.includes('besan') || clean.includes('bhujia')) {
      guessedCategory = 'Namkeen'
    } else if (clean.includes('cocoa') || clean.includes('chocolate')) {
      guessedCategory = 'Chocolate'
    }

    return { calories, sugar, fat, guessedCategory }
  }

  const scanNutritionLabelImage = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsScanning(true)
    setScanStatus('Reading nutrition table with AI OCR...')

    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizingtext') {
            setScanStatus(`Reading label: ${Math.round(m.progress * 100)}%`)
          }
        },
      })

      const extractedText = result.data.text
      const { calories, sugar, fat, guessedCategory } = parseNutritionText(extractedText)

      if (calories === 0 && sugar === 0 && fat === 0) {
        alert('Could not detect clear nutrition numbers. Please ensure the photo is focused on the nutrition table.')
      } else {
        let score = 10 - (sugar * 0.15 + fat * 0.1 + calories * 0.005)
        score = Math.max(1.0, Math.min(9.9, score)).toFixed(1)

        const detectedProduct = {
          name: 'Label Scanned Item (Back Panel)',
          category: guessedCategory,
          score: score,
          sugar: `${sugar.toFixed(1)} g`,
          calories: `${Math.round(calories)} kcal`,
          fat: `${fat.toFixed(1)} g`,
          reason: score >= 7.0 ? 'Balanced nutrient profile per 100g' : 'Elevated sugar or fat proportion from label',
          color: 'peach',
          icon: guessedCategory === 'Potato Chips' ? '🥔' : guessedCategory === 'Instant Noodles' ? '🍜' : '🍪',
        }

        setProducts((prev) => [detectedProduct, ...prev])
        setSelectedProduct(detectedProduct)
        await stopCamera()
        alert(`Label Scanned!\nEnergy: ${calories} kcal | Sugar: ${sugar}g | Fat: ${fat}g`)
      }
    } catch (err) {
      alert('Failed to read the image label. Try again with a clearer photo.')
    } finally {
      setIsScanning(false)
      setScanStatus('')
      if (labelInputRef.current) labelInputRef.current.value = ''
    }
  }

  // --- Barcode Resolver ---
  const resolveBarcodeData = async (barcode) => {
    const cleanBarcode = barcode.trim()

    // Layer 1: Exact SKU Database
    if (EXACT_INDIAN_BARCODES && EXACT_INDIAN_BARCODES[cleanBarcode]) {
      const item = EXACT_INDIAN_BARCODES[cleanBarcode]
      return {
        ...item,
        category: getAccurateCategory(item),
        barcode: cleanBarcode,
      }
    }

    // Layer 2: Open Food Facts API
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`,
        { headers: { 'User-Agent': 'FoodSafetyScanner-India - Version 2.0' } }
      )
      const data = await response.json()

      if ((data.status === 1 || data.status === 'success') && data.product) {
        const p = data.product
        const nutriments = p.nutriments || {}
        const cal = Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0)
        const sug = parseFloat(nutriments.sugars_100g || nutriments.sugars || 0).toFixed(1)
        const fatVal = parseFloat(nutriments.fat_100g || nutriments.fat || 0).toFixed(1)

        let score = 10 - (parseFloat(sug) * 0.15 + parseFloat(fatVal) * 0.1 + cal * 0.005)
        score = Math.max(1.0, Math.min(9.9, score)).toFixed(1)

        const rawItem = {
          name: p.product_name || p.product_name_en || 'Scanned Product',
          category: p.categories_tags?.[0]?.replace('en:', '').replace(/-/g, ' ') || 'Packaged Snack',
        }

        const resolvedCat = getAccurateCategory(rawItem)

        return {
          name: rawItem.name,
          category: resolvedCat,
          score: score,
          sugar: `${sug} g`,
          calories: `${cal} kcal`,
          fat: `${fatVal} g`,
          reason: score >= 7.0 ? 'Balanced nutrient profile' : 'Elevated sugar or fat proportion',
          color: 'peach',
          icon:
            resolvedCat === 'Potato Chips'
              ? '🥔'
              : resolvedCat === 'Biscuits'
              ? '🍪'
              : resolvedCat === 'Instant Noodles'
              ? '🍜'
              : '📦',
          barcode: cleanBarcode,
        }
      }
    } catch (e) {}

    // Layer 3: GS1 India 7-digit brand fallback
    const prefix7 = cleanBarcode.slice(0, 7)
    if (INDIAN_BRAND_FALLBACKS && INDIAN_BRAND_FALLBACKS[prefix7]) {
      const fb = INDIAN_BRAND_FALLBACKS[prefix7]
      return {
        ...fb,
        category: getAccurateCategory(fb),
        barcode: cleanBarcode,
      }
    }

    return null
  }

  const fetchProductByBarcode = async (barcode) => {
    setIsScanning(true)
    try {
      const product = await resolveBarcodeData(barcode)
      if (product) {
        setProducts((prev) => [product, ...prev])
        setSelectedProduct(product)
        await stopCamera()
      } else {
        alert(`Barcode "${barcode}" not recognized. Try uploading a photo of the nutrition label on the back!`)
      }
    } catch (err) {
      alert('Error analyzing barcode.')
    } finally {
      setIsScanning(false)
    }
  }

  const handleMultipleFileUpload = async (event) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsScanning(true)
    setScanStatus(`Analyzing ${files.length} uploaded barcode image(s)...`)

    const html5QrCode = new Html5Qrcode('file-scanner-temp')
    const detectedBarcodes = new Set()

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!file.type.startsWith('image/')) continue

        try {
          const scanResults = await html5QrCode.scanFileV2(file, true)
          if (Array.isArray(scanResults)) {
            scanResults.forEach((res) => {
              if (res.decodedText) detectedBarcodes.add(res.decodedText.trim())
            })
          } else if (scanResults?.decodedText) {
            detectedBarcodes.add(scanResults.decodedText.trim())
          }
        } catch (e) {}
      }

      if (detectedBarcodes.size === 0) {
        alert('No barcode detected. Switch to "Back Nutrition Table (OCR)" to scan the facts instead!')
      } else {
        const resolvedList = []
        for (const code of detectedBarcodes) {
          const item = await resolveBarcodeData(code)
          if (item) resolvedList.push(item)
        }

        if (resolvedList.length > 0) {
          setProducts((prev) => [...resolvedList, ...prev])
          setSelectedProduct(resolvedList[0])
          await stopCamera()
        }
      }
    } catch (err) {
      alert('Failed to process image files.')
    } finally {
      setIsScanning(false)
      setScanStatus('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const startCamera = async () => {
    setCameraError('')
    setIsCameraOpen(true)

    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode('camera-reader')
        scannerInstanceRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 15, qrbox: { width: 280, height: 180 } },
          (decodedText) => fetchProductByBarcode(decodedText),
          () => {}
        )
      } catch (err) {
        setCameraError('Camera access denied or unavailable. Upload photo(s) of the barcode or back label below.')
      }
    }, 150)
  }

  const stopCamera = async () => {
    if (scannerInstanceRef.current) {
      try {
        if (scannerInstanceRef.current.isScanning) {
          await scannerInstanceRef.current.stop()
        }
        scannerInstanceRef.current.clear()
      } catch (err) {}
      scannerInstanceRef.current = null
    }
    setIsCameraOpen(false)
    setIsScanning(false)
    setCameraError('')
  }

  const handleManualBarcodeSubmit = (e) => {
    e.preventDefault()
    if (barcodeInput.trim()) {
      fetchProductByBarcode(barcodeInput.trim())
    }
  }

  const handleAddCustomProduct = (e) => {
    e.preventDefault()
    if (!formName.trim()) return

    const cal = parseFloat(formCalories) || 0
    const sug = parseFloat(formSugar) || 0
    const fatVal = parseFloat(formFat) || 0

    let calculatedScore = 10 - (sug * 0.15 + fatVal * 0.1 + cal * 0.005)
    calculatedScore = Math.max(1.0, Math.min(9.9, calculatedScore)).toFixed(1)

    const resolvedCat = getAccurateCategory({ name: formName, category: formCategory })

    const newProduct = {
      name: formName.trim(),
      category: resolvedCat,
      score: calculatedScore,
      sugar: `${sug} g`,
      calories: `${cal} kcal`,
      fat: `${fatVal} g`,
      reason: calculatedScore >= 7.0 ? 'Balanced nutrient profile' : 'Higher calorie/sugar proportion',
      color: 'peach',
      icon: resolvedCat === 'Potato Chips' ? '🥔' : resolvedCat === 'Instant Noodles' ? '🍜' : '🍪',
    }

    setProducts([newProduct, ...products])
    setSelectedProduct(newProduct)
    setIsModalOpen(false)

    setFormName('')
    setFormCalories('')
    setFormSugar('')
    setFormFat('')
  }

  const currentCategory = selectedProduct ? getAccurateCategory(selectedProduct) : 'Potato Chips'
  const currentAlternatives = CATEGORY_ALTERNATIVES[currentCategory] || CATEGORY_ALTERNATIVES['Potato Chips']

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="app">
      <div id="file-scanner-temp" style={{ display: 'none' }} />

      <header className="navbar">
        <a className="brand" href="#home">
          <span className="brand-icon">✓</span>
          <span>FoodSafety<span className="brand-green">Scanner</span></span>
        </a>

        <nav className="nav-links">
          <a href="#home">Home</a>
          <a href="#products">Explore products</a>
        </nav>

        <button className="nav-button" onClick={() => setIsModalOpen(true)}>
          Enter product stats ↗
        </button>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="status-dot" />
              ACCURATE SNACK MATCHING
            </div>

            <h1>
              Scan any snack.
              <span> Get identical healthier swaps.</span>
            </h1>

            <p className="hero-description">
              Scan Lay's Cream & Onion, Marie Gold, Maggi, or Kurkure via camera, image upload, or back nutrition facts. 
              Always returns 100% like-for-like swaps (chips for chips, biscuits for biscuits).
            </p>

            <div className="hero-actions">
              <button className="primary-button" onClick={startCamera}>
                📷 Open Live Scanner <span>→</span>
              </button>

              <button
                className="secondary-button"
                onClick={() => labelInputRef.current && labelInputRef.current.click()}
              >
                🏷️ Upload Back Label (OCR)
              </button>
              <input
                ref={labelInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={scanNutritionLabelImage}
              />

              <button
                className="secondary-button"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                📁 Upload Barcode Photo(s)
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleMultipleFileUpload}
              />
            </div>

            <div className="hero-note">
              <span>✓</span> Persistent History Activated · Precise Same-Category Swaps
            </div>
          </div>

          <div className="hero-visual">
            <div className="food-card">
              <div className="food-card-top">
                <span className="mini-label">ACCURATE MAPPING</span>
                <span className="demo-tag">LIKE-FOR-LIKE</span>
              </div>
              <div className="food-illustration">🥔 ➔ 🥣</div>
              <div className="food-card-name">Cream & Onion ➔ Roasted Makhana</div>
              <p>Scanning Lay's suggests air-popped chips or roasted makhana, never biscuits or noodles.</p>
              <div className="preview-stats">
                <div><strong>01</strong><span>Scan</span></div>
                <div><strong>02</strong><span>Classify</span></div>
                <div><strong>03</strong><span>Swap</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="search-section" id="search">
          <div>
            <span className="section-kicker">DATABASE SEARCH</span>
            <h2>Find or scan any food product</h2>
            <p>Type below or use the scanner to decode real Indian packaged barcodes.</p>
          </div>

          <div className="search-controls">
            <label className="search-box">
              <span>⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Lay's, Marie Gold, Maggi, Kurkure..."
              />
              {search && (
                <button className="clear-search" onClick={() => setSearch('')}>×</button>
              )}
            </label>
            <button className="scan-button" onClick={startCamera}>
              📷 <span>Open scanner</span>
            </button>
          </div>
        </section>

        <section ref={productsSectionRef} className="products-section" id="products">
          <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="section-kicker">SAVED HISTORY ({products.length})</span>
              <h2>Product Analysis Feed</h2>
              <p>Saved in browser storage. Click any product below to inspect ingredients and category-matched swaps.</p>
            </div>
            {products.length > 0 && (
              <button
                className="secondary-button"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', cursor: 'pointer' }}
                onClick={handleClearHistory}
              >
                🗑️ Clear History
              </button>
            )}
          </div>

          <div className="product-grid">
            {filteredProducts.map((product, idx) => (
              <article
                className={`product-card ${selectedProduct?.name === product.name ? 'selected-card' : ''}`}
                key={`${product.name}-${idx}`}
              >
                <div className={`product-art ${product.color}`}>
                  <span className="product-category">{product.category}</span>
                  <span className="product-emoji">{product.icon}</span>
                  <span className="product-demo">VERIFIED</span>
                </div>

                <div className="product-content">
                  <div className="product-title-row">
                    <h3>{product.name}</h3>
                    <div className="score">
                      <strong>{product.score}</strong><span>/10</span>
                    </div>
                  </div>
                  <p className="product-reason">{product.reason}</p>

                  <div className="nutrient-grid">
                    <div><span>Sugar</span><strong>{product.sugar}</strong></div>
                    <div><span>Energy</span><strong>{product.calories}</strong></div>
                    <div><span>Total fat</span><strong>{product.fat}</strong></div>
                  </div>

                  <button
                    className="details-button"
                    onClick={() => setSelectedProduct(product)}
                  >
                    View nutrition preview <span>→</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {/* Scanner & File Upload Modal */}
      {isCameraOpen && (
        <div className="modal-overlay" onClick={stopCamera}>
          <div className="camera-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Scan Barcode or Upload Label</h3>
              <button className="modal-close" onClick={stopCamera}>×</button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'center' }}>
              <button
                className={scannerMode === 'barcode' ? 'primary-button' : 'secondary-button'}
                style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}
                onClick={() => setScannerMode('barcode')}
              >
                📷 Live Barcode / QR
              </button>
              <button
                className={scannerMode === 'ocr_label' ? 'primary-button' : 'secondary-button'}
                style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}
                onClick={() => setScannerMode('ocr_label')}
              >
                🏷️ Back Nutrition Table (OCR)
              </button>
            </div>

            {scannerMode === 'barcode' ? (
              <>
                {cameraError ? (
                  <div className="camera-error-message" style={{ padding: '1rem', color: '#dc2626' }}>
                    {cameraError}
                  </div>
                ) : (
                  <div className="camera-viewport">
                    <div id="camera-reader" style={{ width: '100%', minHeight: '260px' }}></div>
                    <div className="scanner-hint-tag">
                      {isScanning
                        ? scanStatus || 'Analyzing barcode...'
                        : 'Center barcode in camera box or upload photos below'}
                    </div>
                  </div>
                )}

                <div className="file-upload-section" style={{ margin: '1rem 0', textAlign: 'center' }}>
                  <label className="secondary-button" style={{ display: 'inline-block', cursor: 'pointer' }}>
                    📁 Upload Barcode Photo(s)
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleMultipleFileUpload}
                    />
                  </label>
                </div>

                <form onSubmit={handleManualBarcodeSubmit} className="barcode-fallback-form">
                  <input
                    type="text"
                    placeholder="Or type digits (e.g. 8901491101851 for Lay's Cream & Onion)"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                  />
                  <button type="submit" className="primary-button" disabled={isScanning}>
                    {isScanning ? 'Processing...' : 'Lookup →'}
                  </button>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏷️</div>
                <h4>No Barcode on the Packet?</h4>
                <p style={{ fontSize: '0.85rem', color: '#666', maxWidth: '340px', margin: '0.5rem auto 1.5rem auto' }}>
                  Take or upload a clear photo of the <strong>"Nutrition Information"</strong> table printed on the back.
                </p>

                <label className="primary-button" style={{ display: 'inline-block', cursor: 'pointer', padding: '0.8rem 1.6rem' }}>
                  📸 Snap or Upload Nutrition Table
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={scanNutritionLabelImage}
                  />
                </label>

                {isScanning && (
                  <div style={{ marginTop: '1.2rem', color: '#059669', fontWeight: 'bold' }}>
                    {scanStatus || 'Reading label with AI OCR...'}
                  </div>
                )}
              </div>
            )}

            <div className="camera-controls">
              <button className="secondary-button" onClick={stopCamera}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Report Section */}
      {selectedProduct && (
        <section ref={reportRef} className="report-section">
          <button className="secondary-button" onClick={() => setSelectedProduct(null)}>
            ← Back to products
          </button>

          <div className="report-header">
            <span className="section-kicker">NUTRITION ANALYSIS</span>
            <h2>{selectedProduct.name}</h2>
            <p>Category: <strong>{currentCategory}</strong></p>
          </div>

          <div className="report-score-card">
            <div>
              <span className="section-kicker">HEALTH SCORE</span>
              <div className="report-score">
                {selectedProduct.score}<span>/10</span>
              </div>
              <p>{selectedProduct.reason}</p>
            </div>
            <div className="report-product-icon">
              {selectedProduct.icon}
            </div>
          </div>

          <div className="report-nutrition-card">
            <h3>Nutrition information (per 100g)</h3>
            <div className="report-row">
              <span>Energy</span>
              <strong>{selectedProduct.calories}</strong>
            </div>
            <div className="report-row">
              <span>Total sugar</span>
              <strong>{selectedProduct.sugar}</strong>
            </div>
            <div className="report-row">
              <span>Total fat</span>
              <strong>{selectedProduct.fat}</strong>
            </div>
          </div>

          {/* Context-Aware Snack Alternatives */}
          <div className="report-alternatives-card">
            <span className="section-kicker">HEALTHIER SWAPS FOR {currentCategory.toUpperCase()}</span>
            <h3>Better alternatives in this exact snack category</h3>
            <p className="report-muted">
              Matching your exact craving with lower sugar, less maida, and healthy oils.
            </p>

            <div className="alternatives-grid">
              {currentAlternatives.map((alt, idx) => (
                <div
                  className="alt-item alt-clickable"
                  key={idx}
                  onClick={() =>
                    setSelectedProduct({
                      name: alt.name,
                      category: currentCategory,
                      score: alt.score,
                      calories: alt.calories,
                      sugar: alt.sugar,
                      fat: alt.fat,
                      icon: alt.icon,
                      reason: alt.reason,
                    })
                  }
                >
                  <div className="alt-badge">Healthier Choice</div>
                  <div className="alt-header">
                    <span className="alt-icon">{alt.icon}</span>
                    <div>
                      <h4>{alt.name}</h4>
                      <span className="alt-score">Score: {alt.score}/10</span>
                    </div>
                  </div>
                  <p>{alt.reason}</p>
                  <div className="alt-stats">
                    <span>Sugar: {alt.sugar}</span>
                    <span>Energy: {alt.calories}</span>
                    <span>Fat: {alt.fat}</span>
                  </div>
                  <span className="alt-action">View report →</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Manual Input Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Analyze Food Product Manually</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddCustomProduct} className="modal-form">
              <label>
                Product Name
                <input
                  type="text"
                  required
                  placeholder="e.g. Lay's Cream & Onion, Marie Light"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </label>

              <label>
                Category (for accurate matching)
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', marginTop: '0.3rem', borderRadius: '6px' }}
                >
                  <option value="Potato Chips">Chips & Crisps</option>
                  <option value="Biscuits">Biscuits & Cookies</option>
                  <option value="Instant Noodles">Instant Noodles & Pasta</option>
                  <option value="Namkeen">Namkeen & Savory Mixture</option>
                  <option value="Chocolate">Chocolates & Sweets</option>
                  <option value="Beverages">Drinks & Juices</option>
                </select>
              </label>

              <div className="form-row">
                <label>
                  Energy (kcal / 100g)
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 544"
                    value={formCalories}
                    onChange={(e) => setFormCalories(e.target.value)}
                  />
                </label>
                <label>
                  Total Sugar (g / 100g)
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 4.2"
                    value={formSugar}
                    onChange={(e) => setFormSugar(e.target.value)}
                  />
                </label>
              </div>

              <label>
                Total Fat (g / 100g)
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 33.8"
                  value={formFat}
                  onChange={(e) => setFormFat(e.target.value)}
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Calculate Score & Preview →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="footer">
        <a className="brand" href="#home">
          <span className="brand-icon">✓</span>
          <span>FoodSafety<span className="brand-green">Scanner</span></span>
        </a>
        <p>Understand the label. Compare relevant options.</p>
      </footer>
    </div>
  )
}

export default App