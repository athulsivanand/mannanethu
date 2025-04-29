import { useState, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import Cookies from 'js-cookie'
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
  Checkbox,        // Import Checkbox
  FormControlLabel // Import FormControlLabel
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import LogoutIcon from '@mui/icons-material/Logout'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import * as XLSX from 'xlsx'
import html2canvas from 'html2canvas'
import { PDFDocument } from 'pdf-lib'
import Login from './components/Login'
import ProtectedRoute from './components/ProtectedRoute'

interface Item {
  description: string
  qty: number
  unit: string
  rate: number
  amount: number
}

interface QuotationData {
  customerName: string
  address: string
  mobile: string
  quoteNo: string
  date: string
  validDays: string
  Requirements: string
  items: Item[]
  preparedBy: string
  salesMan: string
  showTitle?: boolean // <-- Add state for title visibility
}

interface ValidationErrors {
  customerName?: string
  address?: string
  mobile?: string
  quoteNo?: string
}

function QuotationApp() {
  const navigate = useNavigate()
  const quotationRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [customUnit, setCustomUnit] = useState('')

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
    showTitle: true // <-- Initialize default state
  })

  const [newItem, setNewItem] = useState<Item>({
    description: '',
    qty: 0,
    unit: '',
    rate: 0,
    amount: 0,
  })

  const [baseQuoteNo, setBaseQuoteNo] = useState<string>('')

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

  // Handler for the checkbox
  const handleToggleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuotationData(prev => ({
        ...prev,
        showTitle: event.target.checked,
    }));
  };


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
    // Basic increment logic - might need refinement for complex quote numbers (e.g., with prefixes/suffixes)
    const match = lastQuoteNo.match(/(\d+)$/)
    if (match) {
        const num = parseInt(match[1], 10);
        const prefix = lastQuoteNo.substring(0, match.index);
        return `${prefix}${num + 1}`;
    }
    // If no number found at the end, just return the current one (or append '1')
    return lastQuoteNo ? `${lastQuoteNo}-1` : '1';
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

    // Conditionally add the 'QUOTATION' title row
    const excelData = [
      ...(quotationData.showTitle ?? true ? [['QUOTATION']] : []), // <-- Conditional Title
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
    ].filter(row => row.length > 0 && row.some(cell => cell !== undefined && cell !== null && cell !== '')); // Filter empty rows more reliably


    const worksheet = XLSX.utils.aoa_to_sheet(excelData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Quotation')

    XLSX.writeFile(workbook, `Quotation_${quotationData.quoteNo}.xlsx`)
    setSnackbar({
      open: true,
      message: 'Excel file exported successfully',
      severity: 'success'
    })
  }

  const exportToPDF = async () => {
    if (!validateFields()) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error'
      })
      return
    }

    if (quotationRef.current) {
      // Temporarily ensure the container is wide enough for html2canvas
      const originalWidth = quotationRef.current.style.width;
      quotationRef.current.style.width = '800px'; // Or adjust as needed

      const canvas = await html2canvas(quotationRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        width: 800, // Match the width set above
        windowWidth: 800 // Ensure viewport matches
      });

      // Restore original width
      quotationRef.current.style.width = originalWidth;

      const imgData = canvas.toDataURL('image/png')

      // Create PDF with metadata
      const pdfDoc = await PDFDocument.create()

      // Add metadata (includes showTitle now)
      pdfDoc.setTitle(`Quotation ${quotationData.quoteNo}`)
      // Ensure quotationData has necessary defaults before stringifying
      const dataToSave = {
          ...quotationData,
          showTitle: quotationData.showTitle ?? true // Ensure boolean value
      };
      pdfDoc.setSubject(JSON.stringify(dataToSave))

      // Add the page with the quotation content
      // Calculate page size based on canvas, consider standard sizes if needed
      const pdfPageWidth = canvas.width / 2; // Adjust scale factor if needed
      const pdfPageHeight = canvas.height / 2;
      const page = pdfDoc.addPage([pdfPageWidth, pdfPageHeight]);

      const img = await pdfDoc.embedPng(imgData)
      page.drawImage(img, {
        x: 0,
        y: 0,
        width: pdfPageWidth,
        height: pdfPageHeight,
      })

      // Save the PDF
      const pdfBytes = await pdfDoc.save()

      // Create a blob and download
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
          message: 'No quotation data found in the PDF metadata',
          severity: 'error'
        })
        return
      }

      // Parse the metadata and update the form
      const loadedData: QuotationData = JSON.parse(metadata);

      // Set state, ensuring defaults for potentially missing fields
      setQuotationData({
        customerName: loadedData.customerName || '',
        address: loadedData.address || '',
        mobile: loadedData.mobile || '',
        quoteNo: loadedData.quoteNo || '',
        date: loadedData.date || new Date().toLocaleDateString('en-GB'),
        validDays: loadedData.validDays || '7',
        Requirements: loadedData.Requirements || '',
        items: loadedData.items || [],
        preparedBy: loadedData.preparedBy || '',
        salesMan: loadedData.salesMan || '',
        showTitle: loadedData.showTitle ?? true, // <-- Load showTitle state, default to true
      });

      // Set base quote number if loading an existing quote
      if (loadedData.quoteNo) {
        setBaseQuoteNo(loadedData.quoteNo);
      } else {
        setBaseQuoteNo(''); // Reset if no quote number in loaded data
      }


      setSnackbar({
        open: true,
        message: 'PDF loaded successfully',
        severity: 'success'
      })
    } catch (error) {
        console.error("Error loading PDF:", error); // Log the error for debugging
        let message = 'Error loading PDF';
        if (error instanceof Error) {
            message += ': ' + error.message;
        } else if (typeof error === 'string') {
             message += ': ' + error;
        } else {
            message += ': Unknown error occurred.';
        }
        setSnackbar({
            open: true,
            message: message,
            severity: 'error'
        });
    } finally {
        // Reset the file input so the same file can be loaded again if needed
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
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
    exportToPDF() // Consider making this async and waiting?

    // Get next quote number before resetting
    const nextQuoteNo = getNextQuoteNo()

    // Reset form with incremented quote number and default title visibility
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
      salesMan: '',
      showTitle: true // <-- Reset showTitle to default
    })
    // Reset base quote number for the new quote
    setBaseQuoteNo(nextQuoteNo);
    setErrors({}); // Clear errors
    setNewItem({ description: '', qty: 0, unit: '', rate: 0, amount: 0 }); // Clear new item form
    setCustomUnit('');
  }

  const handleLogout = () => {
    Cookies.remove('auth')
    navigate('/login')
  }

  // Use ?? true to handle cases where showTitle might be undefined temporarily
  const shouldShowTitle = quotationData.showTitle ?? true;

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

      <Container maxWidth="lg" sx={{ py: 4 }}> {/* Changed to lg for more space */}
        {/* Form for editing */}
        <Paper sx={{ p: 4, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Edit Quotation Details
          </Typography>
          <Grid container spacing={3}>
            {/* Column 1: Customer Details etc. */}
            <Grid item xs={12} sm={6}>
              {/* ... (Customer Name, Address, Mobile, Requirements, Prepared By TextFields) */}
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
            {/* Column 2: Quote Details, Salesperson, Title Toggle */}
            <Grid item xs={12} sm={6}>
              {/* ... (Quote No, Date, Valid Days, Salesperson TextFields) */}
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
                type="text" // Keep as text to allow flexible date formats if needed
                // Consider using a Date Picker component for better UX
              />
              <TextField
                fullWidth
                label="Valid Days"
                value={quotationData.validDays}
                onChange={handleCustomerChange('validDays')}
                margin="normal"
                type="text" // Keep as text, maybe add inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
              />
              <TextField
                fullWidth
                label="Salesperson"
                value={quotationData.salesMan}
                onChange={handleCustomerChange('salesMan')}
                margin="normal"
              />

              {/* --- Add Title Toggle Checkbox --- */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={shouldShowTitle} // Use derived state
                    onChange={handleToggleChange}
                    name="showTitleToggle"
                    color="primary"
                  />
                }
                label="Show 'QUOTATION' Title in Preview/Export"
                sx={{ mt: 2 }} // Add some margin top
              />
              {/* --- End Title Toggle Checkbox --- */}

            </Grid>
          </Grid>

          {/* Add Item Form */}
          <Box sx={{ mt: 4, borderTop: '1px solid lightgrey', pt: 3 }}> {/* Added border and padding */}
            <Typography variant="h6" gutterBottom>
              Add Item
            </Typography>
            <Grid container spacing={2} alignItems="flex-start"> {/* Changed to flex-start */}
              <Grid item xs={12} sm={4} md={3}> {/* Adjusted grid size */}
                <TextField
                  fullWidth
                  label="Description"
                  value={newItem.description}
                  onChange={handleItemChange('description')}
                  size="small" // Use smaller size for item fields
                />
              </Grid>
              <Grid item xs={6} sm={2} md={1}> {/* Adjusted grid size */}
                <TextField
                  fullWidth
                  label="Quantity"
                  type="number"
                  value={newItem.qty || ''}
                  onChange={handleItemChange('qty')}
                  size="small"
                   inputProps={{ min: 0, step: "any" }} // Allow decimals, prevent negative
                />
              </Grid>
              <Grid item xs={6} sm={3} md={2}> {/* Adjusted grid size */}
                <TextField
                  fullWidth
                  label="Unit"
                  value={newItem.unit}
                  onChange={handleItemChange('unit')}
                  select
                  SelectProps={{
                    native: true,
                  }}
                  size="small"
                >
                  <option value="">Select</option> {/* Changed default text */}
                  <option value="NOS">NOS</option>
                  <option value="KG">KG</option>
                  <option value="SQFT">SQFT</option>
                  <option value="MTR">MTR</option> {/* Added MTR */}
                  <option value="LTR">LTR</option> {/* Added LTR */}
                  <option value="SET">SET</option> {/* Added SET */}
                  <option value="BAG">BAG</option> {/* Added BAG */}
                  <option value="custom">Other</option>
                </TextField>
                {newItem.unit === 'custom' && (
                  <TextField
                    fullWidth
                    label="Custom Unit"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    size="small"
                    margin="dense" // Use dense margin
                    sx={{ mt: 1 }}
                  />
                )}
              </Grid>
              <Grid item xs={6} sm={2} md={2}> {/* Adjusted grid size */}
                <TextField
                  fullWidth
                  label="Rate"
                  type="number"
                  value={newItem.rate || ''}
                  onChange={handleItemChange('rate')}
                  size="small"
                  inputProps={{ min: 0, step: "any" }}
                />
              </Grid>
              <Grid item xs={6} sm={3} md={2}> {/* Adjusted grid size */}
                <TextField
                  fullWidth
                  label="Amount"
                  value={formatAmount(newItem.amount)}
                  InputProps={{ readOnly: true }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={2} md={2} sx={{ display: 'flex', alignItems: 'center' }}> {/* Adjusted grid size and alignment */}
                <Button
                  variant="contained"
                  onClick={addItem}
                  fullWidth
                  size="medium" // Match button size better
                >
                  Add
                </Button>
              </Grid>
            </Grid>
          </Box>

          {/* Items Table */}
          <TableContainer sx={{ mt: 4 }}>
            {/* ... (Existing Table structure) ... */}
             <Table size="small"> {/* Optional: use small size table */}
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 'bold' } }}> {/* Bold headers */}
                  <TableCell>Description</TableCell>
                  <TableCell align="right">QTY</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell align="right">Rate</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {quotationData.items.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={6} align="center">No items added yet.</TableCell>
                    </TableRow>
                ) : (
                    quotationData.items.map((item, index) => (
                    <TableRow key={index} hover> {/* Add hover effect */}
                        <TableCell sx={{ wordBreak: 'break-word', maxWidth: '300px' }}>{item.description}</TableCell> {/* Prevent long descriptions breaking layout */}
                        <TableCell align="right">{item.qty}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell align="right">{formatAmount(item.rate)}</TableCell> {/* Format rate */}
                        <TableCell align="right">{formatAmount(item.amount)}</TableCell>
                        <TableCell align="center">
                        <IconButton
                            color="error"
                            onClick={() => removeItem(index)}
                            size="small"
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                        </TableCell>
                    </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Preview/Export View */}
        {/* Added a wrapper Box to control width for html2canvas more easily if needed */}
        <Box sx={{ mb: 4, width: '100%', overflowX: 'auto' }}>
            <Paper ref={quotationRef} sx={{
                p: { xs: 2, sm: 4 }, // Responsive padding
                border: '2px solid #000',
                position: 'relative',
                minWidth: '750px', // Ensure minimum width for layout consistency
                width: '100%', // Take available width within the Box
                boxSizing: 'border-box' // Include padding and border in width
            }}>
            {/* --- Conditionally Render Title --- */}
            {shouldShowTitle && (
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
            {/* --- End Conditional Title --- */}


            {/* Company Info with Logo */}
            <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' }, // Stack on small screens
                alignItems: 'center',
                mb: 3,
                pb: 2,
                borderBottom: '1px solid #000'
            }}>
                <Box sx={{ width: { xs: 100, sm: 150 }, mr: { sm: 2 }, mb: { xs: 2, sm: 0 }, flexShrink: 0 }}> {/* Adjust logo size and margin */}
                    <img src="/logo.png" alt="Mannanethu Agencies" style={{ width: '100%', display: 'block' }} /> {/* Added display block */}
                </Box>
                <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}> {/* Center text on small screens */}
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
            {/* ... (Existing Grid structure for Customer/Quote details) ... */}
             <Grid container spacing={2} sx={{ mb: 3, pb: 2, borderBottom: '1px solid #000' }}>
                <Grid item xs={12} sm={7} md={8}> {/* Give more space to customer details */}
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {quotationData.customerName || 'N/A'}
                    </Typography>
                    <Typography variant="body2" style={{ whiteSpace: 'pre-line' }}>
                        {quotationData.address || 'N/A'}
                    </Typography>
                    <Typography variant="body2">
                        MOB.NO. {quotationData.mobile || 'N/A'}
                    </Typography>
                </Grid>
                <Grid item xs={12} sm={5} md={4} sx={{ textAlign: { xs: 'left', sm: 'right' }, mt: { xs: 2, sm: 0 } }}> {/* Align right on larger screens */}
                    <Typography variant="body2">
                        DATE: {quotationData.date}
                    </Typography>
                    <Typography variant="body2">
                        Quote No: {quotationData.quoteNo || 'N/A'}
                    </Typography>
                    <Typography variant="body2">
                        Valid for {quotationData.validDays} Days
                    </Typography>
                    <Typography variant="body2">
                        Salesperson: {quotationData.salesMan || 'N/A'}
                    </Typography>
                </Grid>
            </Grid>


            {/* Items Table */}
            <TableContainer sx={{ mb: 3 }}> {/* Added margin bottom */}
                {/* ... (Existing Table structure for items in preview) ... */}
                  <Table size="small" sx={{ border: '1px solid #000' }}>
                    <TableHead>
                        <TableRow sx={{ '& th': { borderBottom: '2px solid #000', borderRight: '1px solid #000', fontWeight: 'bold', padding: '4px 8px' } }}>
                        <TableCell>Description of Goods</TableCell>
                        <TableCell align="right">QTY</TableCell>
                        <TableCell>Unit</TableCell>
                        <TableCell align="right">Rate</TableCell>
                        <TableCell align="right" sx={{ borderRight: 'none' }}>Amount</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {quotationData.items.length === 0 ? (
                             <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ borderRight: 'none', padding: '20px' }}> (No Items) </TableCell>
                             </TableRow>
                        ) : (
                            quotationData.items.map((item, index) => (
                            <TableRow key={index} sx={{ '& td': { borderRight: '1px solid #000', padding: '4px 8px', verticalAlign: 'top' } }}>
                                <TableCell sx={{ wordBreak: 'break-word', maxWidth: '300px' }}>{item.description}</TableCell>
                                <TableCell align="right">{item.qty}</TableCell>
                                <TableCell>{item.unit}</TableCell>
                                <TableCell align="right">{formatAmount(item.rate)}</TableCell>
                                <TableCell align="right" sx={{ borderRight: 'none' }}>{formatAmount(item.amount)}</TableCell>
                            </TableRow>
                            ))
                        )}
                        {/* Separator Row */}
                        <TableRow>
                            <TableCell colSpan={5} sx={{ padding: 0, borderTop: '1px solid #000', borderRight: 'none' }}></TableCell>
                        </TableRow>
                         {/* Grand Total Row */}
                        <TableRow>
                        <TableCell colSpan={4} align="right" sx={{
                            borderTop: '2px solid #000',
                            borderBottom: '2px solid #000',
                            fontWeight: 'bold',
                            borderRight: '1px solid #000',
                            padding: '4px 8px'
                        }}>
                            GRAND TOTAL
                        </TableCell>
                        <TableCell align="right" sx={{
                            borderTop: '2px solid #000',
                            borderBottom: '2px solid #000',
                            fontWeight: 'bold',
                            borderRight: 'none',
                            padding: '4px 8px'
                        }}>
                            {formatAmount(calculateTotal())}
                        </TableCell>
                        </TableRow>
                    </TableBody>
                    </Table>
            </TableContainer>

            {/* Requirements Section */}
            {quotationData.Requirements && (
                <Box sx={{ mt: 3, mb: 3 }}> {/* Added margin bottom */}
                <Typography variant="body1" sx={{ fontWeight: 'bold', textDecoration: 'underline', mb: 1 }}>
                    Requirements:
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                    {quotationData.Requirements}
                </Typography>
                </Box>
            )}

            {/* Bottom Section */}
            {/* ... (Existing Bottom Section structure) ... */}
             <Box sx={{
                mt: 4,
                pt: 2,
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' }, // Stack vertically on small screens
                justifyContent: 'space-between',
                alignItems: { xs: 'center', sm: 'flex-end' }, // Center items when stacked
                gap: { xs: 3, sm: 2 } // Add gap between elements
            }}>
                {/* Prepared By - Bottom Left */}
                <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                <Typography variant="body2" sx={{ borderTop: '1px solid #000', pt: 1, display: 'inline-block' }}> {/* Ensure border covers text */}
                    Prepared By: {quotationData.preparedBy || '................'}
                </Typography>
                </Box>

                {/* Logos - Bottom Middle */}
                <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                order: { xs: 3, sm: 2 } // Change order on small screens if needed
                }}>
                <Box sx={{ display: 'flex', gap: {xs: 2, sm: 4} }}> {/* Adjust gap */}
                    <img src="/tc.png" alt="TC" style={{ height: '40px' }} /> {/* Slightly smaller logos */}
                    <img src="/msquare.png" alt="M-SQUARE" style={{ height: '40px' }} />
                </Box>
                </Box>

                {/* Authorised Signatory - Bottom Right */}
                <Box sx={{ textAlign: 'center', order: { xs: 2, sm: 3 } }}> {/* Change order */}
                <Typography variant="body2" sx={{ borderTop: '1px solid #000', pt: 1, display: 'inline-block' }}>
                    Authorised Signatory
                </Typography>
                </Box>
            </Box>
            </Paper>
        </Box>


        {/* Action Buttons */}
        <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" sx={{ gap: 1 }}> {/* Allow wrapping and add gap */}
          <Button
            variant="contained"
            color="success" // Changed color
            onClick={handleSubmit}
            disabled={quotationData.items.length === 0 || Object.keys(errors).length > 0} // Disable if errors exist
          >
            Submit & Create New
          </Button>
          <Button
            variant="contained"
            onClick={exportToPDF}
            disabled={Object.keys(errors).length > 0} // Disable if errors exist
          >
            Export to PDF
          </Button>
          <Button
             variant="outlined" // Changed variant
             onClick={exportToExcel}
             disabled={Object.keys(errors).length > 0} // Disable if errors exist
          >
            Export to Excel
          </Button>
          <Button
            variant="outlined" // Changed variant
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
          autoHideDuration={4000} // Slightly shorter duration
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} // Center snackbar
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} variant="filled" sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </>
  )
}


// --- App Component (No changes needed here) ---
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(Cookies.get('auth') === 'true')

  const handleLogin = () => {
    Cookies.remove('auth'); // Remove existing cookie first
    Cookies.set('auth', 'true', { expires: 1 }); // Set cookie to expire in 1 day
    setIsAuthenticated(true);
  };

  // Add a handler for logout within App if needed, or keep it in QuotationApp
  const handleLogout = () => {
      Cookies.remove('auth');
      setIsAuthenticated(false);
      // Optional: Redirect to login page immediately if preferred
      // window.location.pathname = '/login'; // Force redirect if router context is tricky
  };


  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route
          path="/"
          element={
            // Pass handleLogout to QuotationApp if needed for coordination
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <QuotationApp /* onLogout={handleLogout} */ />
            </ProtectedRoute>
          }
        />
         {/* Add a fallback route for unknown paths */}
        <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
      </Routes>
    </Router>
  )
}

// Need to import Navigate for the fallback route
import { Navigate } from 'react-router-dom';

export default App;