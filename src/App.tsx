import { useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Box,
  Grid,
  Stack,
  Alert,
  Snackbar,
  AppBar,
  Toolbar,
  Checkbox, // <-- Import Checkbox
  FormControlLabel, // <-- Import FormControlLabel
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';

// ... (Keep interfaces Item, QuotationData, ValidationErrors as they are) ...

interface Item {
  description: string;
  qty: number;
  unit: string;
  rate: number;
  amount: number;
}

interface QuotationData {
  customerName: string;
  address: string;
  mobile: string;
  quoteNo: string;
  date: string;
  validDays: string;
  Requirements: string;
  items: Item[];
  preparedBy: string;
  salesMan: string;
}

interface ValidationErrors {
  customerName?: string;
  address?: string;
  mobile?: string;
  quoteNo?: string;
}


function QuotationApp() {
  const navigate = useNavigate();
  const quotationRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [customUnit, setCustomUnit] = useState('');

  // --- State for Title Toggle ---
  const [showQuotationTitle, setShowQuotationTitle] = useState(true); // <-- Add state, default true

  const [quotationData, setQuotationData] = useState<QuotationData>({
    customerName: '',
    address: '',
    mobile: '',
    quoteNo: '',
    date: new Date().toLocaleDateString('en-GB'),
    validDays: '7',
    Requirements: '',
    items: [],
    preparedBy: '',
    salesMan: '',
  });

  const [newItem, setNewItem] = useState<Item>({
    description: '',
    qty: 0,
    unit: '',
    rate: 0,
    amount: 0,
  });

  const [baseQuoteNo, setBaseQuoteNo] = useState<string>('');

  // ... (Keep formatAmount, validateFields, handleCustomerChange, handleItemChange, getNextQuoteNo, addItem, removeItem, calculateTotal functions as they are) ...

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const validateFields = (): boolean => {
    const newErrors: ValidationErrors = {}

    if (!quotationData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required'
    }

    if (!quotationData.address.trim()) {
      newErrors.address = 'Address is required'
    }

    if (!quotationData.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required'
    } else if (!/^\d{10}$/.test(quotationData.mobile.trim())) {
      newErrors.mobile = 'Please enter a valid 10-digit mobile number'
    }

    if (!quotationData.quoteNo.trim()) {
      newErrors.quoteNo = 'Quote number is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCustomerChange = (field: keyof QuotationData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value
    if (field === 'quoteNo' && !baseQuoteNo) {
      setBaseQuoteNo(value)
    }
    setQuotationData({ ...quotationData, [field]: value })
    if (errors[field as keyof ValidationErrors]) {
      setErrors({ ...errors, [field]: undefined })
    }
  }

  const handleItemChange = (field: keyof Item) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'description' || field === 'unit'
      ? event.target.value
      : Number(event.target.value)

    const updatedItem = { ...newItem, [field]: value }

    if (field === 'qty' || field === 'rate') {
      updatedItem.amount = Number((updatedItem.qty * updatedItem.rate).toFixed(2))
    }

    if (field === 'unit') {
      setCustomUnit('')
    }

    setNewItem(updatedItem)
  }

  const getNextQuoteNo = () => {
    if (!baseQuoteNo) return ''
    const lastQuoteNo = quotationData.quoteNo || baseQuoteNo
    const numericPart = parseInt(lastQuoteNo)
    if (isNaN(numericPart)) return lastQuoteNo
    return (numericPart + 1).toString()
  }

  const addItem = () => {
    if (!newItem.description || !newItem.qty || !newItem.rate) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required item fields',
        severity: 'error'
      })
      return
    }

    const itemToAdd = {
      ...newItem,
      unit: newItem.unit === 'custom' ? customUnit : newItem.unit
    }

    setQuotationData(prev => ({
      ...prev,
      items: [...prev.items, itemToAdd]
    }))

    setNewItem({
      description: '',
      qty: 0,
      unit: '',
      rate: 0,
      amount: 0,
    })
    setCustomUnit('')
  }

  const removeItem = (index: number) => {
    const updatedItems = quotationData.items.filter((_, i) => i !== index)
    setQuotationData({ ...quotationData, items: updatedItems })
  }

  const calculateTotal = () => {
    return quotationData.items.reduce((sum, item) => sum + item.amount, 0)
  }

  const exportToExcel = () => {
     if (!validateFields()) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error'
      })
      return
    }

    // --- Excel Export: Conditionally add title ---
    const excelData = [
      // Conditionally add the title row
      ...(showQuotationTitle ? [['QUOTATION']] : []),
      ['MANNANETHU AGENCIES'],
      ['THATTEKATTUPADI, CHETTIKULANGARA P O'],
      ['ALAPPUZHA DIST, 690 106'],
      ['MOB: 6235353512, 7025777710'],
      ['Email: mannanethu@gmail.com'],
      [''],
      ['Salesperson:', quotationData.salesMan],
      [''],
      ['Customer Details:'],
      ['Name:', quotationData.customerName],
      ['Address:', quotationData.address],
      ['Mobile:', quotationData.mobile],
      [''],
      ['Quote No:', quotationData.quoteNo],
      ['Date:', quotationData.date],
      ['Valid for:', quotationData.validDays + ' Days'],
      [''],
      ['Description of Goods', 'QTY', 'Unit', 'Rate', 'Amount'],
      ...quotationData.items.map(item => [
        item.description,
        item.qty,
        item.unit,
        item.rate,
        formatAmount(item.amount)
      ]),
      [''],
      ['GRAND TOTAL', '', '', '', formatAmount(calculateTotal())],
      [''],
      ['Requirements:', quotationData.Requirements],
      [''],
      ['Prepared By:', quotationData.preparedBy],
    ].filter(row => row.length > 0);

    const worksheet = XLSX.utils.aoa_to_sheet(excelData); // Use modified data

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Quotation')

    XLSX.writeFile(workbook, `Quotation_${quotationData.quoteNo}.xlsx`)
    setSnackbar({
      open: true,
      message: 'Excel file exported successfully',
      severity: 'success'
    })
  };


  const exportToPDF = async () => {
    if (!validateFields()) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error'
      })
      return
    }

    // Ensure the DOM reflects the current state BEFORE capturing
    // (React might batch state updates, but usually this is fine.
    // If issues arise, might need a slight delay or callback).
    if (quotationRef.current) {
      const canvas = await html2canvas(quotationRef.current, {
        scale: 2,
        backgroundColor: '#ffffff'
      })
      const imgData = canvas.toDataURL('image/png')

      const pdfDoc = await PDFDocument.create()

      pdfDoc.setTitle(`Quotation ${quotationData.quoteNo}`)
      pdfDoc.setSubject(JSON.stringify(quotationData)) // Keep metadata as is

      const page = pdfDoc.addPage([canvas.width, canvas.height])
      const img = await pdfDoc.embedPng(imgData)
      page.drawImage(img, {
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height,
      })

      const pdfBytes = await pdfDoc.save()

      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Quotation_${quotationData.quoteNo}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)

      setSnackbar({
        open: true,
        message: 'PDF exported successfully',
        severity: 'success'
      })
    }
  }

  // ... (Keep handleFileUpload, handleSubmit, handleLogout functions as they are) ...
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)

      // Get metadata from the PDF
      const metadata = pdfDoc.getSubject()
      if (!metadata) {
        setSnackbar({
          open: true,
          message: 'No quotation data found in the PDF',
          severity: 'error'
        })
        return
      }

      // Parse the metadata and update the form
      const loadedQuotationData = JSON.parse(metadata)
      setQuotationData(loadedQuotationData)

      // Reset title toggle to default or potentially load from metadata if saved
      setShowQuotationTitle(true); // Resetting to default for now

      setSnackbar({
        open: true,
        message: 'PDF loaded successfully',
        severity: 'success'
      })
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error loading PDF: ' + (error instanceof Error ? error.message : 'Unknown error'),
        severity: 'error'
      })
    }
  }

   const handleSubmit = () => {
    if (!validateFields()) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error'
      })
      return
    }

    // Export to PDF
    exportToPDF()

    // Get next quote number before resetting
    const nextQuoteNo = getNextQuoteNo()

    // Reset form with incremented quote number
    setQuotationData({
      customerName: '',
      address: '',
      mobile: '',
      quoteNo: nextQuoteNo,
      date: new Date().toLocaleDateString('en-GB'),
      validDays: '7',
      Requirements: '',
      items: [],
      preparedBy: '',
      salesMan: ''
    })
    // Reset title toggle as well for the new form
    setShowQuotationTitle(true);
  }

   const handleLogout = () => {
    Cookies.remove('auth')
    navigate('/login')
  }

  return (
    <>
      <AppBar position="static" sx={{ mb: 4 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Mannanethu Agencies - Quotation System
          </Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Form for editing */}
        <Paper sx={{ p: 4, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Edit Quotation Details
          </Typography>
          <Grid container spacing={3}>
            {/* Existing fields */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Customer Name"
                value={quotationData.customerName}
                onChange={handleCustomerChange('customerName')}
                error={!!errors.customerName}
                helperText={errors.customerName}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Address"
                value={quotationData.address}
                onChange={handleCustomerChange('address')}
                error={!!errors.address}
                helperText={errors.address}
                margin="normal"
                multiline
                rows={2}
              />
              <TextField
                fullWidth
                label="Mobile"
                value={quotationData.mobile}
                onChange={handleCustomerChange('mobile')}
                error={!!errors.mobile}
                helperText={errors.mobile}
                margin="normal"
              />
               <TextField
                fullWidth
                label="Requirements"
                value={quotationData.Requirements}
                onChange={handleCustomerChange('Requirements')}
                margin="normal"
                multiline
                rows={3}
              />
              <TextField
                fullWidth
                label="Prepared By"
                value={quotationData.preparedBy}
                onChange={handleCustomerChange('preparedBy')}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Quote No"
                value={quotationData.quoteNo}
                onChange={handleCustomerChange('quoteNo')}
                error={!!errors.quoteNo}
                helperText={errors.quoteNo}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Date"
                value={quotationData.date}
                onChange={handleCustomerChange('date')}
                margin="normal"
                type="text"
              />
              <TextField
                fullWidth
                label="Valid Days"
                value={quotationData.validDays}
                onChange={handleCustomerChange('validDays')}
                margin="normal"
                type="text"
              />
              <TextField
                fullWidth
                label="Salesperson"
                value={quotationData.salesMan}
                onChange={handleCustomerChange('salesMan')}
                margin="normal"
              />
               {/* --- Add Checkbox for Title Toggle --- */}
               <Grid item xs={12} sx={{ mt: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={showQuotationTitle}
                      onChange={(e) => setShowQuotationTitle(e.target.checked)}
                      name="showTitle"
                      color="primary"
                    />
                  }
                  label="Show 'QUOTATION' Title in Header"
                />
               </Grid>
             </Grid>
          </Grid>


          {/* Add Item Form */}
          {/* ... (Keep Add Item form as is) ... */}
           <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Add Item
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Description"
                  value={newItem.description}
                  onChange={handleItemChange('description')}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  label="Quantity"
                  type="number"
                  value={newItem.qty || ''}
                  onChange={handleItemChange('qty')}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  label="Unit"
                  value={newItem.unit}
                  onChange={handleItemChange('unit')}
                  select
                  SelectProps={{
                    native: true,
                  }}
                >
                  <option value="">Select Unit</option>
                  <option value="NOS">NOS</option>
                  <option value="KG">KG</option>
                  <option value="SQFT">SQFT</option>
                  <option value="custom">Other</option>
                </TextField>
                {newItem.unit === 'custom' && (
                  <TextField
                    fullWidth
                    label="Custom Unit"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    size="small"
                    margin="normal"
                  />
                )}
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  label="Rate"
                  type="number"
                  value={newItem.rate || ''}
                  onChange={handleItemChange('rate')}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  label="Amount"
                  value={formatAmount(newItem.amount)}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={1}>
                <Button
                  variant="contained"
                  onClick={addItem}
                  fullWidth
                >
                  Add
                </Button>
              </Grid>
            </Grid>
          </Box>


          {/* Items Table */}
          {/* ... (Keep Items Table as is) ... */}
          <TableContainer sx={{ mt: 4 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">QTY</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell align="right">Rate</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {quotationData.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell align="right">{item.qty}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell align="right">{item.rate}</TableCell>
                    <TableCell align="right">{formatAmount(item.amount)}</TableCell>
                    <TableCell align="center">
                      <IconButton
                        color="error"
                        onClick={() => removeItem(index)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

        </Paper>

        {/* Preview/Export View */}
        <Paper ref={quotationRef} sx={{ p: 4, mb: 4, border: '2px solid #000', position: 'relative' }}>
          {/* Header */}
          {/* --- Conditionally render the title --- */}
          {showQuotationTitle && (
            <Typography
              variant="h4"
              align="center"
              sx={{
                mb: 3,
                pb: 1,
                borderBottom: '2px solid #000',
                fontWeight: 'bold'
              }}
            >
              QUOTATION
            </Typography>
          )}

          {/* Company Info with Logo */}
          {/* ... (Keep Company Info section as is) ... */}
           <Box sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 3,
            pb: 2,
            borderBottom: '1px solid #000'
          }}>
            <Box sx={{ width: 150, mr: 2 }}>
              <img src="/logo.png" alt="Mannanethu Agencies" style={{ width: '100%' }} />
            </Box>
            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                MANNANETHU AGENCIES
              </Typography>
              <Typography variant="body2">
                THATTEKATTUPADI, CHETTIKULANGARA P O
              </Typography>
              <Typography variant="body2">
                ALAPPUZHA DIST, 690 106
              </Typography>
              <Typography variant="body2">
                MOB: 6235353512, 7025777710
              </Typography>
              <Typography variant="body2">
                Email: mannanethu@gmail.com
              </Typography>
            </Box>
          </Box>


          {/* Customer and Quote Details */}
          {/* ... (Keep Customer and Quote Details section as is) ... */}
          <Grid container spacing={2} sx={{ mb: 3, pb: 2, borderBottom: '1px solid #000' }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                {quotationData.customerName}
              </Typography>
              <Typography variant="body2" style={{ whiteSpace: 'pre-line' }}>
                {quotationData.address}
              </Typography>
              <Typography variant="body2">
                MOB.NO. {quotationData.mobile}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} sx={{ textAlign: 'right' }}>
              <Typography variant="body2">
                DATE: {quotationData.date}
              </Typography>
              <Typography variant="body2">
                Quote No: {quotationData.quoteNo}
              </Typography>
              <Typography variant="body2">
                Valid for {quotationData.validDays} Days
              </Typography>
              <Typography variant="body2">
                Salesperson: {quotationData.salesMan}
              </Typography>
            </Grid>
          </Grid>


          {/* Items Table */}
          {/* ... (Keep Items Table preview as is) ... */}
           <TableContainer>
            <Table sx={{ border: '1px solid #000' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ borderBottom: '2px solid #000', borderRight: '1px solid #000', fontWeight: 'bold' }}>Description of Goods</TableCell>
                  <TableCell align="right" sx={{ borderBottom: '2px solid #000', borderRight: '1px solid #000', fontWeight: 'bold' }}>QTY</TableCell>
                  <TableCell sx={{ borderBottom: '2px solid #000', borderRight: '1px solid #000', fontWeight: 'bold' }}>Unit</TableCell>
                  <TableCell align="right" sx={{ borderBottom: '2px solid #000', borderRight: '1px solid #000', fontWeight: 'bold' }}>Rate</TableCell>
                  <TableCell align="right" sx={{ borderBottom: '2px solid #000', fontWeight: 'bold' }}>Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {quotationData.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell sx={{ borderRight: '1px solid #000' }}>{item.description}</TableCell>
                    <TableCell align="right" sx={{ borderRight: '1px solid #000' }}>{item.qty}</TableCell>
                    <TableCell sx={{ borderRight: '1px solid #000' }}>{item.unit}</TableCell>
                    <TableCell align="right" sx={{ borderRight: '1px solid #000' }}>{item.rate}</TableCell>
                    <TableCell align="right">{formatAmount(item.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={4} align="right" sx={{
                    borderTop: '2px solid #000',
                    borderBottom: '2px solid #000',
                    fontWeight: 'bold',
                    borderRight: '1px solid #000'
                  }}>
                    GRAND TOTAL
                  </TableCell>
                  <TableCell align="right" sx={{
                    borderTop: '2px solid #000',
                    borderBottom: '2px solid #000',
                    fontWeight: 'bold'
                  }}>
                    {formatAmount(calculateTotal())}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>


          {/* Requirements Section */}
          {/* ... (Keep Requirements section as is) ... */}
           {quotationData.Requirements && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                Requirements:
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                {quotationData.Requirements}
              </Typography>
            </Box>
          )}


          {/* Bottom Section */}
          {/* ... (Keep Bottom section as is) ... */}
          <Box sx={{
            mt: 4,
            pt: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end'
          }}>
            {/* Prepared By - Bottom Left */}
            <Box>
              <Typography variant="body2" sx={{ borderTop: '1px solid #000', pt: 1 }}>
                Prepared By: {quotationData.preparedBy}
              </Typography>
            </Box>

            {/* Logos - Bottom Middle */}
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1
            }}>
              <Box sx={{ display: 'flex', gap: 4 }}>
                <img src="/tc.png" alt="TC" style={{ height: '50px' }} />
                <img src="/msquare.png" alt="M-SQUARE" style={{ height: '50px' }} />
              </Box>
            </Box>

            {/* Authorised Signatory - Bottom Right */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ borderTop: '1px solid #000', pt: 1 }}>
                Authorised Signatory
              </Typography>
            </Box>
          </Box>

        </Paper>

        {/* Action Buttons */}
        {/* ... (Keep Buttons and Snackbar as is) ... */}
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={quotationData.items.length === 0}
          >
            Submit & Create New
          </Button>
          <Button variant="contained" onClick={exportToPDF}>
            Export to PDF
          </Button>
          <Button variant="contained" onClick={exportToExcel}>
            Export to Excel
          </Button>
          <Button
            variant="contained"
            startIcon={<UploadFileIcon />}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload PDF
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf"
            style={{ display: 'none' }}
          />
        </Stack>

         <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </>
  );
}


// ... (Keep App component as is) ...
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(Cookies.get('auth') === 'true');

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route
          path="/"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <QuotationApp />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}


export default App;
