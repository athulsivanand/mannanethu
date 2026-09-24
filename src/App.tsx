import { useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import {
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
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
    Checkbox,
    FormControlLabel,
    MenuItem, // <-- Import MenuItem for Select
    Select,   // <-- Import Select
    InputLabel, // <-- Import InputLabel
    FormControl // <-- Import FormControl
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit'; // <-- Import Edit Icon
import CancelIcon from '@mui/icons-material/Cancel'; // <-- Import Cancel Icon (optional)
import LogoutIcon from '@mui/icons-material/Logout';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';

// ... (Keep interfaces Item, QuotationData, ValidationErrors) ...
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
    const [clearItemsOpen, setClearItemsOpen] = useState(false);
    const [customUnit, setCustomUnit] = useState('');
    const [showQuotationTitle, setShowQuotationTitle] = useState(true);

    // --- State for Item Editing ---
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null); // null = not editing

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

    const standardUnits = ['NOS', 'KG', 'SQFT']; // Define standard units

    // ... (Keep formatAmount, validateFields, handleCustomerChange functions) ...
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


    // Modified handleItemChange to work with Select component
    const handleItemChange = (field: keyof Item) => (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string> // Updated type
    ) => {
        let value: string | number;

        // Handle Select component change
        if (typeof event === 'object' && event !== null && 'target' in event && 'value' in event.target) {
             value = event.target.value;
             // Special handling for unit Select
             if (field === 'unit') {
                 if (value === 'custom') {
                     setCustomUnit(''); // Clear custom unit if 'Other' is selected
                 }
                 setNewItem(prev => ({
                    ...prev,
                    unit: value as string, // Store 'custom' or the selected unit
                    amount: Number((prev.qty * prev.rate).toFixed(2)) // Recalculate amount
                 }));
                 return; // Exit early for unit select
             }
             // Handle numeric fields
             if (field === 'qty' || field === 'rate') {
                value = Number(value) || 0; // Ensure it's a number, default to 0 if invalid
             }
        } else {
            // Should not happen with current setup, but keep for safety
            value = '';
        }


        const updatedItem = { ...newItem, [field]: value };

        if (field === 'qty' || field === 'rate') {
            updatedItem.amount = Number((updatedItem.qty * updatedItem.rate).toFixed(2));
        }

        setNewItem(updatedItem);
    };


    // ... (Keep getNextQuoteNo function) ...
    const getNextQuoteNo = () => {
        if (!baseQuoteNo) return ''
        const lastQuoteNo = quotationData.quoteNo || baseQuoteNo
        // Try to find the last number in the string
        const match = lastQuoteNo.match(/\d+$/);
        if (!match) return lastQuoteNo; // Return as is if no number at the end

        const numericPartStr = match[0];
        const prefix = lastQuoteNo.substring(0, lastQuoteNo.length - numericPartStr.length);
        const numericPart = parseInt(numericPartStr, 10);

        if (isNaN(numericPart)) return lastQuoteNo // Should not happen with regex but safety check
        return prefix + (numericPart + 1).toString().padStart(numericPartStr.length, '0'); // Keep padding
    }


    const validateItem = (item: Item): boolean => {
        if (!item.description || item.qty <= 0 || item.rate <= 0 || !item.unit || (item.unit === 'custom' && !customUnit.trim())) {
            setSnackbar({
                open: true,
                message: 'Please fill Description, valid Qty (>0), Rate (>0), and select/enter a Unit for the item.',
                severity: 'error'
            });
            return false;
        }
        return true;
    }

    const resetItemForm = () => {
        setNewItem({ description: '', qty: 0, unit: '', rate: 0, amount: 0 });
        setCustomUnit('');
        setEditingItemIndex(null); // Ensure editing mode is off
    }

    // Modified addItem
    const addItem = () => {
        // Prevent adding if editing
        if (editingItemIndex !== null) {
             setSnackbar({ open: true, message: 'Cannot add item while editing. Please update or cancel.', severity: 'error' });
             return;
        }

        if (!validateItem(newItem)) {
            return;
        }

        const itemToAdd: Item = {
            ...newItem,
            unit: newItem.unit === 'custom' ? customUnit.trim() : newItem.unit,
            // Ensure amount is correctly calculated before adding
            amount: Number((newItem.qty * newItem.rate).toFixed(2))
        };

        setQuotationData(prev => ({
            ...prev,
            items: [...prev.items, itemToAdd]
        }));

        resetItemForm(); // Reset form fields and custom unit
    }

    // --- New Function: Handle Edit Click ---
    const handleEditItemClick = (index: number) => {
        const itemToEdit = quotationData.items[index];
        setEditingItemIndex(index);

        // Check if the unit is standard or custom
        if (standardUnits.includes(itemToEdit.unit)) {
            setNewItem({ ...itemToEdit });
            setCustomUnit(''); // Clear custom unit field
        } else {
            // It's a custom unit
            setNewItem({ ...itemToEdit, unit: 'custom' }); // Set dropdown to 'custom'
            setCustomUnit(itemToEdit.unit); // Populate the custom unit input
        }
    }

    // --- New Function: Update Item ---
    const updateItem = () => {
        if (editingItemIndex === null) return; // Should not happen but safety check

        if (!validateItem(newItem)) {
            return;
        }

        const updatedItemData: Item = {
            ...newItem,
            unit: newItem.unit === 'custom' ? customUnit.trim() : newItem.unit,
            // Ensure amount is correctly calculated before updating
            amount: Number((newItem.qty * newItem.rate).toFixed(2))
        };


        const updatedItems = quotationData.items.map((item, index) =>
            index === editingItemIndex ? updatedItemData : item
        );

        setQuotationData(prev => ({
            ...prev,
            items: updatedItems
        }));

        resetItemForm(); // Reset form and editing state
        setSnackbar({ open: true, message: 'Item updated successfully', severity: 'success' });
    }

     // --- New Function: Cancel Edit ---
    const cancelEdit = () => {
        resetItemForm(); // Resets form and editing index
    }

    // Modified removeItem
    const removeItem = (indexToRemove: number) => {
        // If the item being removed is the one currently being edited, cancel the edit first
        if (indexToRemove === editingItemIndex) {
             cancelEdit();
        }
        const updatedItems = quotationData.items.filter((_, index) => index !== indexToRemove);
        setQuotationData({ ...quotationData, items: updatedItems });

        // Adjust editing index if an item before the edited one was removed
        if (editingItemIndex !== null && indexToRemove < editingItemIndex) {
            setEditingItemIndex(editingItemIndex - 1);
        }
    }


    const moveItem = (index: number, direction: -1 | 1) => {
        if (editingItemIndex !== null) return;
        setQuotationData(previous => {
            const destination = index + direction;
            if (destination < 0 || destination >= previous.items.length) return previous;
            const items = [...previous.items];
            [items[index], items[destination]] = [items[destination], items[index]];
            return { ...previous, items };
        });
    };

    const clearItems = () => {
        setQuotationData(previous => ({ ...previous, items: [] }));
        resetItemForm();
        setClearItemsOpen(false);
        setSnackbar({ open: true, message: 'All items cleared. Customer and quotation details kept.', severity: 'success' });
    };

    // ... (Keep calculateTotal, exportToExcel, exportToPDF, handleFileUpload, handleSubmit, handleLogout functions - they don't need changes for item editing itself) ...
    const calculateTotal = () => {
        return quotationData.items.reduce((sum, item) => sum + item.amount, 0)
    }

    const exportToExcel = () => {
         if (!validateFields()) {
          setSnackbar({
            open: true,
            message: 'Please fill in all required customer/quote fields',
            severity: 'error'
          })
          return
        }
        if (quotationData.items.length === 0) {
            setSnackbar({open: true, message: 'Cannot export empty quotation', severity: 'error'});
            return;
        }

        const excelData = [
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

        const worksheet = XLSX.utils.aoa_to_sheet(excelData);

        // Add basic styling (optional, requires more setup for complex styles)
        // Example: Make headers bold (this might not render perfectly in all viewers)
        const headerCells = ['A18', 'B18', 'C18', 'D18', 'E18'];
        headerCells.forEach(cellRef => {
            if(worksheet[cellRef]) worksheet[cellRef].s = { font: { bold: true } };
        });
         if(worksheet['A'+(18 + quotationData.items.length + 2)]) {
             worksheet['A'+(18 + quotationData.items.length + 2)].s = { font: { bold: true } }; // Grand Total Label
         }
         if(worksheet['E'+(18 + quotationData.items.length + 2)]) {
             worksheet['E'+(18 + quotationData.items.length + 2)].s = { font: { bold: true }, alignment: { horizontal: 'right'} }; // Grand Total Value
         }


        // Adjust column widths (example)
         worksheet['!cols'] = [
            { wch: 40 }, // Description
            { wch: 10 }, // QTY
            { wch: 10 }, // Unit
            { wch: 15 }, // Rate
            { wch: 15 }  // Amount
         ];


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
            message: 'Please fill in all required customer/quote fields',
            severity: 'error'
          })
          return
        }
        if (quotationData.items.length === 0) {
            setSnackbar({open: true, message: 'Cannot export empty quotation', severity: 'error'});
            return;
        }

        if (quotationRef.current) {
            // Ensure the DOM reflects the current state, especially title visibility
            // Force a re-render cycle if necessary, though usually state updates are sufficient
            await new Promise(resolve => setTimeout(resolve, 0)); // Small delay to help ensure DOM update

            const canvas = await html2canvas(quotationRef.current, {
                scale: 2, // Increase scale for better resolution
                backgroundColor: '#ffffff',
                logging: false, // Disable html2canvas logging in console
                useCORS: true, // If using external images/fonts
                // Attempt to capture full element height even if scrolled
                windowWidth: quotationRef.current.scrollWidth,
                windowHeight: quotationRef.current.scrollHeight
            });
            const imgData = canvas.toDataURL('image/png');

            const pdfDoc = await PDFDocument.create();

            pdfDoc.setTitle(`Quotation ${quotationData.quoteNo}`);
            // Store full data including title visibility state
            const metadataToStore = {
                ...quotationData,
                showQuotationTitle: showQuotationTitle // Save the title state
            }
            pdfDoc.setSubject(JSON.stringify(metadataToStore));

            // A4 dimensions in points (approx 595 x 842)
            const a4Width = 595;
            const a4Height = 842;
            let page = pdfDoc.addPage([a4Width, a4Height]); // Use A4 size

            const pngImage = await pdfDoc.embedPng(imgData);
            const pngDims = pngImage.scale(1); // Get original dimensions

            // Calculate scaling factor to fit width
            const scale = a4Width / pngDims.width;
            const scaledHeight = pngDims.height * scale;

            // Check if scaled height exceeds A4 height
            if (scaledHeight > a4Height) {
                 // Basic multi-page handling (split image - more complex logic needed for clean breaks)
                 // This is a simplified example, actual implementation might need pdf-lib drawing commands
                 // or splitting the html2canvas capture. For now, just scale to fit height.
                 const heightScale = a4Height / pngDims.height;
                 page.drawImage(pngImage, {
                     x: 0,
                     y: 0,
                     width: pngDims.width * heightScale,
                     height: a4Height,
                 });
                 console.warn("Content exceeds single PDF page, scaled to fit height. Consider multi-page logic.");

            } else {
                page.drawImage(pngImage, {
                    x: 0,
                    // Position at top of page (pdf-lib y-axis starts from bottom)
                    y: a4Height - scaledHeight,
                    width: a4Width,
                    height: scaledHeight,
                });
            }


            const pdfBytes = await pdfDoc.save();

            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Quotation_${quotationData.quoteNo}.pdf`;
            link.click();
            window.URL.revokeObjectURL(url);

            setSnackbar({
                open: true,
                message: 'PDF exported successfully',
                severity: 'success'
            });
        } else {
             setSnackbar({ open: true, message: 'Error: Quotation preview element not found.', severity: 'error' });
        }
    }


    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const metadata = pdfDoc.getSubject();

            if (!metadata) {
                setSnackbar({ open: true, message: 'No quotation data found in the PDF metadata (Subject field)', severity: 'error' });
                return;
            }

            const loadedData = JSON.parse(metadata);

            // Validate essential parts of loaded data (basic check)
            if (!loadedData || typeof loadedData !== 'object' || !Array.isArray(loadedData.items)) {
                 throw new Error("Invalid data format in PDF metadata.");
            }


            // Update state
            setQuotationData({
                customerName: loadedData.customerName || '',
                address: loadedData.address || '',
                mobile: loadedData.mobile || '',
                quoteNo: loadedData.quoteNo || '',
                date: loadedData.date || new Date().toLocaleDateString('en-GB'),
                validDays: loadedData.validDays || '7',
                Requirements: loadedData.Requirements || '',
                items: loadedData.items || [], // Ensure items is an array
                preparedBy: loadedData.preparedBy || '',
                salesMan: loadedData.salesMan || '',
            });

            // Restore title visibility state if it was saved
            setShowQuotationTitle(loadedData.showQuotationTitle !== undefined ? loadedData.showQuotationTitle : true);
             // Set base quote number for increment logic
             if(loadedData.quoteNo) {
                setBaseQuoteNo(loadedData.quoteNo);
             } else {
                setBaseQuoteNo('');
             }


            // Reset item form and editing state
            resetItemForm();


            setSnackbar({ open: true, message: 'PDF loaded successfully', severity: 'success' });

        } catch (error) {
            console.error("Error loading PDF:", error);
            setSnackbar({
                open: true,
                message: 'Error loading PDF: ' + (error instanceof Error ? error.message : 'Invalid file or data'),
                severity: 'error'
            });
        } finally {
             // Reset file input to allow uploading the same file again
             if (fileInputRef.current) {
                 fileInputRef.current.value = '';
             }
        }
    };

     const handleSubmit = () => {
        if (!validateFields()) {
          setSnackbar({
            open: true,
            message: 'Please fill in all required customer/quote fields',
            severity: 'error'
          })
          return
        }
        if (quotationData.items.length === 0) {
             setSnackbar({open: true, message: 'Cannot submit an empty quotation. Please add items.', severity: 'error'});
             return;
        }

        // Export to PDF first
        exportToPDF().then(() => {
            // Get next quote number BEFORE resetting
            const nextQuoteNo = getNextQuoteNo();
            const currentSalesMan = quotationData.salesMan; // Preserve Salesperson
            const currentPreparedBy = quotationData.preparedBy; // Preserve Prepared By

            // Reset form with incremented quote number, keep salesperson/preparedBy
            setQuotationData({
                customerName: '',
                address: '',
                mobile: '',
                quoteNo: nextQuoteNo, // Use the calculated next number
                date: new Date().toLocaleDateString('en-GB'),
                validDays: '7',
                Requirements: '',
                items: [],
                preparedBy: currentPreparedBy, // Keep
                salesMan: currentSalesMan,   // Keep
            });

             // Reset the base quote number based on the new quote number for next increment
             setBaseQuoteNo(nextQuoteNo);

            // Reset item form and editing state
            resetItemForm();
            // Reset title toggle for the new form
            setShowQuotationTitle(true);
            // Clear validation errors
            setErrors({});

            setSnackbar({open: true, message: `Quotation ${quotationData.quoteNo} submitted (PDF Exported). New form ready.`, severity: 'success'});

        }).catch(error => {
            console.error("Error during PDF export on submit:", error);
            // Don't clear the form if PDF export failed
            setSnackbar({open: true, message: 'Submission failed: Could not export PDF.', severity: 'error'});
        });

    }

    const handleLogout = () => {
        Cookies.remove('auth');
        navigate('/login');
    }


    return (
        <>
            {/* ... (Keep AppBar) ... */}
             <AppBar position="static" elevation={0} sx={{ backgroundColor: '#15364a' }}>
                <Toolbar>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Mannanethu Agencies
                </Typography>
                <IconButton aria-label="Log out" color="inherit" onClick={handleLogout}>
                    <LogoutIcon />
                </IconButton>
                </Toolbar>
            </AppBar>

            <Container maxWidth="lg" sx={{ py: 4 }}> {/* Changed to lg for more space */}
                {/* Form for editing */}
                <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 4, border: '1px solid #dce4eb', borderRadius: 3 }}>  {/* Slightly less padding */}
                    <Typography variant="h6" gutterBottom>
                        Quotation details
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Add customer details, build your item list, then preview and export your quotation.
                    </Typography>
                    <Grid container spacing={2}> {/* Reduced spacing */}
                        {/* Customer/Quote Fields */}
                        <Grid item xs={12} sm={6} md={6}>
                            <TextField fullWidth label="Customer Name" value={quotationData.customerName} onChange={handleCustomerChange('customerName')} error={!!errors.customerName} helperText={errors.customerName} margin="dense" size="small" />
                            <TextField fullWidth label="Address" value={quotationData.address} onChange={handleCustomerChange('address')} error={!!errors.address} helperText={errors.address} margin="dense" size="small" multiline rows={2} />
                            <TextField fullWidth label="Mobile" value={quotationData.mobile} onChange={handleCustomerChange('mobile')} error={!!errors.mobile} helperText={errors.mobile} margin="dense" size="small" />
                            <TextField fullWidth label="Requirements" value={quotationData.Requirements} onChange={handleCustomerChange('Requirements')} margin="dense" size="small" multiline rows={2} />

                        </Grid>
                        <Grid item xs={12} sm={6} md={6}>
                            <TextField fullWidth label="Quote No" value={quotationData.quoteNo} onChange={handleCustomerChange('quoteNo')} error={!!errors.quoteNo} helperText={errors.quoteNo} margin="dense" size="small" />
                            <TextField fullWidth label="Date" value={quotationData.date} onChange={handleCustomerChange('date')} margin="dense" size="small" type="text" />
                            <TextField fullWidth label="Valid Days" value={quotationData.validDays} onChange={handleCustomerChange('validDays')} margin="dense" size="small" type="text" />
                            <TextField fullWidth label="Salesperson" value={quotationData.salesMan} onChange={handleCustomerChange('salesMan')} margin="dense" size="small"/>
                            <TextField fullWidth label="Prepared By" value={quotationData.preparedBy} onChange={handleCustomerChange('preparedBy')} margin="dense" size="small"/>
                             <FormControlLabel
                                control={<Checkbox checked={showQuotationTitle} onChange={(e) => setShowQuotationTitle(e.target.checked)} name="showTitle" color="primary" size="small"/>}
                                label="Show 'QUOTATION' Title"
                                sx={{ mt: 1 }}
                             />
                        </Grid>
                    </Grid>


                    {/* Add/Edit Item Form */}
                    <Box sx={{ mt: 3, p: { xs: 2, sm: 3 }, backgroundColor: '#f4f8fb', border: '1px solid #dce4eb', borderRadius: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            {editingItemIndex !== null ? `Editing item ${editingItemIndex + 1}` : 'Add an item'}
                        </Typography>
                        <Grid container spacing={1} alignItems="flex-start"> {/* Use flex-start */}
                            <Grid item xs={12} sm={6} md={4}>
                                <TextField fullWidth label="Description" value={newItem.description} onChange={handleItemChange('description')} margin="dense" size="small" multiline maxRows={3}/>
                            </Grid>
                            <Grid item xs={6} sm={3} md={1}>
                                <TextField fullWidth label="Qty" type="number" value={newItem.qty || ''} onChange={handleItemChange('qty')} inputProps={{ min: 0, step: "any" }} margin="dense" size="small"/>
                            </Grid>
                             {/* Unit Selection */}
                             <Grid item xs={6} sm={4} md={2}>
                                <FormControl fullWidth margin="dense" size="small">
                                    <InputLabel>Unit</InputLabel>
                                    <Select
                                        label="Unit"
                                        value={newItem.unit}
                                        onChange={handleItemChange('unit')}
                                    >
                                        <MenuItem value=""><em>Select Unit</em></MenuItem>
                                        {standardUnits.map(unit => (
                                            <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                                        ))}
                                        <MenuItem value="custom">Other...</MenuItem>
                                    </Select>
                                </FormControl>
                                {newItem.unit === 'custom' && (
                                    <TextField
                                        fullWidth
                                        label="Custom Unit"
                                        value={customUnit}
                                        onChange={(e) => setCustomUnit(e.target.value)}
                                        size="small"
                                        margin="dense" // Changed from normal
                                        sx={{ mt: 1 }} // Add top margin if needed
                                    />
                                )}
                             </Grid>

                            <Grid item xs={6} sm={3} md={2}>
                                <TextField fullWidth label="Rate" type="number" value={newItem.rate || ''} onChange={handleItemChange('rate')} inputProps={{ min: 0, step: "any" }} margin="dense" size="small"/>
                            </Grid>
                            <Grid item xs={6} sm={3} md={2}>
                                <TextField fullWidth label="Amount" value={formatAmount(newItem.amount)} InputProps={{ readOnly: true }} margin="dense" size="small"/>
                            </Grid>
                             {/* Action Buttons for Item Form */}
                             <Grid item xs={12} sm={3} md={1} sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: '8px' }}> {/* Adjusted pt */}
                                {editingItemIndex !== null ? (
                                    <>
                                        <Button variant="contained" onClick={updateItem} size="small" color="success">Update</Button>
                                        <Button variant="outlined" onClick={cancelEdit} size="small" startIcon={<CancelIcon />} >Cancel</Button>
                                    </>
                                ) : (
                                    <Button variant="contained" onClick={addItem} size="small" disabled={editingItemIndex !== null} >Add</Button>
                                )}
                            </Grid>
                        </Grid>
                    </Box>

                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} sx={{ mt: 3 }}>
                        <Box>
                            <Typography variant="h6">Items ({quotationData.items.length})</Typography>
                            <Typography variant="body2" color="text.secondary">Use the arrows to arrange items in quotation order.</Typography>
                        </Box>
                        <Button color="error" startIcon={<DeleteIcon />} disabled={quotationData.items.length === 0 || editingItemIndex !== null} onClick={() => setClearItemsOpen(true)}>Clear all items</Button>
                    </Stack>
                    {editingItemIndex !== null && <Alert severity="info" sx={{ mt: 2 }}>Update or cancel your edit before rearranging or clearing items.</Alert>}
                    {/* Items Table */}
                    <TableContainer sx={{ mt: 3 }}>
                        <Table size="small" aria-label="Quotation items" sx={{ minWidth: 680 }}> {/* Use small size */}
                            <TableHead>
                                <TableRow sx={{ '& th': { fontWeight: 'bold', backgroundColor: '#f5f5f5' } }}>
                                    <TableCell sx={{width: '40%'}}>Description</TableCell> {/* Add widths */}
                                    <TableCell align="right">QTY</TableCell>
                                    <TableCell>Unit</TableCell>
                                    <TableCell align="right">Rate</TableCell>
                                    <TableCell align="right">Amount</TableCell>
                                    <TableCell align="center" sx={{width: '160px'}}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {quotationData.items.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>Your item list is empty. Add your first item above.</TableCell>
                                    </TableRow>
                                )}
                                {quotationData.items.map((item, index) => (
                                    <TableRow key={index} selected={editingItemIndex === index} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell align="right">{item.qty}</TableCell>
                                        <TableCell>{item.unit}</TableCell>
                                        <TableCell align="right">{formatAmount(item.rate)}</TableCell> {/* Format rate too */}
                                        <TableCell align="right">{formatAmount(item.amount)}</TableCell>
                                        <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                                            <IconButton size="small" aria-label={`Move item ${index + 1} up`} title="Move up" disabled={index === 0 || editingItemIndex !== null} onClick={() => moveItem(index, -1)}><ArrowUpwardIcon fontSize="small" /></IconButton>
                                            <IconButton size="small" aria-label={`Move item ${index + 1} down`} title="Move down" disabled={index === quotationData.items.length - 1 || editingItemIndex !== null} onClick={() => moveItem(index, 1)}><ArrowDownwardIcon fontSize="small" /></IconButton>
                                            {/* --- Edit Button --- */}
                                            <IconButton
                                                size="small"
                                                color="primary"
                                                aria-label={`Edit item ${index + 1}`}
                                                onClick={() => handleEditItemClick(index)}
                                                disabled={editingItemIndex !== null && editingItemIndex !== index} // Disable other edits when one is active
                                            >
                                                <EditIcon fontSize="small"/>
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                aria-label={`Delete item ${index + 1}`}
                                                onClick={() => removeItem(index)}
                                                disabled={editingItemIndex !== null} // Disable delete while editing
                                            >
                                                <DeleteIcon fontSize="small"/>
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, p: 2, bgcolor: '#f4f8fb', borderRadius: 2 }}>
                        <Typography color="text.secondary">Quotation total</Typography>
                        <Typography variant="h6" sx={{ fontVariantNumeric: 'tabular-nums' }}>₹ {formatAmount(calculateTotal())}</Typography>
                    </Box>
                </Paper>

                {/* Preview/Export View */}
                <Typography variant="h6" sx={{ mb: 1, mt: 4, textAlign: 'center', borderBottom: '1px dashed grey' }}>
                    Preview / Export View
                </Typography>
                <Paper ref={quotationRef} sx={{ p: { xs: 2, sm: 3, md: 4 }, mb: 4, border: '1px solid #ccc', position: 'relative' }}> {/* Use relative padding */}
                   {/* Conditional Title */}
                   {showQuotationTitle && (
                      <Typography variant="h4" align="center" sx={{ mb: 3, pb: 1, borderBottom: '2px solid #000', fontWeight: 'bold' }}>
                         QUOTATION
                      </Typography>
                   )}
                   {/* Company Info */}
                   <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, pb: 2, borderBottom: '1px solid #000' }}>
                       <Box sx={{ width: { xs: 80, sm: 120, md: 150 }, mr: 2 }}> {/* Responsive logo size */}
                          <img src="/logo.png" alt="Mannanethu Agencies" style={{ width: '100%', height: 'auto' }} />
                       </Box>
                       <Box>
                          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>
                             MANNANETHU AGENCIES
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                             THATTEKATTUPADI, CHETTIKULANGARA P O, ALAPPUZHA DIST, 690 106
                          </Typography>
                          {/* <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                             ALAPPUZHA DIST, 690 106
                          </Typography> */}
                          <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                             MOB: 6235353512, 7025777710
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                             Email: mannanethu@gmail.com
                          </Typography>
                       </Box>
                    </Box>
                   {/* Customer/Quote Details */}
                   <Grid container spacing={1} sx={{ mb: 3, pb: 2, borderBottom: '1px solid #000', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      <Grid item xs={12} sm={6}>
                         <Typography variant="body1" sx={{ fontWeight: 'bold', fontSize: 'inherit' }}>
                            {quotationData.customerName}
                         </Typography>
                         <Typography variant="body2" style={{ whiteSpace: 'pre-line', fontSize: 'inherit' }}>
                            {quotationData.address}
                         </Typography>
                         <Typography variant="body2" sx={{ fontSize: 'inherit' }}>
                            MOB.NO. {quotationData.mobile}
                         </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} sx={{ textAlign: { xs: 'left', sm: 'right' }, mt: { xs: 1, sm: 0 } }}>
                         <Typography variant="body2" sx={{ fontSize: 'inherit' }}>
                            DATE: {quotationData.date}
                         </Typography>
                         <Typography variant="body2" sx={{ fontSize: 'inherit' }}>
                            Quote No: {quotationData.quoteNo}
                         </Typography>
                         <Typography variant="body2" sx={{ fontSize: 'inherit' }}>
                            Valid for {quotationData.validDays} Days
                         </Typography>
                          <Typography variant="body2" sx={{ fontSize: 'inherit' }}>
                            Salesperson: {quotationData.salesMan}
                         </Typography>
                      </Grid>
                   </Grid>

                   {/* Preview Items Table */}
                   <TableContainer sx={{ mb: 3 }}>
                       <Table sx={{ border: '1px solid #000' }} size="small">
                          <TableHead>
                              <TableRow sx={{ '& th': { fontWeight: 'bold', borderBottom: '2px solid #000', borderRight: '1px solid #000', padding: '4px 8px', fontSize: { xs: '0.7rem', sm: '0.8rem' } } }}>
                                  <TableCell>Description of Goods</TableCell>
                                  <TableCell align="right">QTY</TableCell>
                                  <TableCell>Unit</TableCell>
                                  <TableCell align="right">Rate</TableCell>
                                  <TableCell align="right" sx={{ borderRight: 0 }}>Amount</TableCell>
                              </TableRow>
                          </TableHead>
                          <TableBody sx={{ '& td': { borderRight: '1px solid #000', padding: '4px 8px', fontSize: { xs: '0.7rem', sm: '0.8rem' } } }}>
                              {quotationData.items.map((item, index) => (
                                  <TableRow key={index}>
                                      <TableCell>{item.description}</TableCell>
                                      <TableCell align="right">{item.qty}</TableCell>
                                      <TableCell>{item.unit}</TableCell>
                                      <TableCell align="right">{formatAmount(item.rate)}</TableCell>
                                      <TableCell align="right" sx={{ borderRight: 0 }}>{formatAmount(item.amount)}</TableCell>
                                  </TableRow>
                              ))}
                              {/* Ensure Grand Total row cells also have borders */}
                              <TableRow sx={{ '& td': { borderTop: '2px solid #000', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.85rem' } } }}>
                                  <TableCell colSpan={4} align="right" sx={{ borderRight: '1px solid #000' }}>
                                      GRAND TOTAL
                                  </TableCell>
                                  <TableCell align="right" sx={{ borderRight: 0 }}>
                                      {formatAmount(calculateTotal())}
                                  </TableCell>
                              </TableRow>
                          </TableBody>
                       </Table>
                   </TableContainer>


                   {/* Requirements */}
                   {quotationData.Requirements && (
                       <Box sx={{ mt: 3, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                           <Typography variant="body1" sx={{ fontWeight: 'bold', fontSize: 'inherit' }}>
                              Requirements:
                           </Typography>
                           <Typography variant="body2" sx={{ whiteSpace: 'pre-line', fontSize: 'inherit' }}>
                              {quotationData.Requirements}
                           </Typography>
                       </Box>
                   )}

                   {/* Bottom Section */}
                   <Box sx={{
                       mt: 4,
                       pt: 2,
                       display: 'flex',
                       flexDirection: { xs: 'column', sm: 'row' }, // Stack on small screens
                       justifyContent: 'space-between',
                       alignItems: { xs: 'center', sm: 'flex-end' }, // Center stack, align end row
                       gap: { xs: 3, sm: 1 }, // Add gap for stacked view
                       fontSize: { xs: '0.7rem', sm: '0.8rem' }
                    }}>
                       {/* Prepared By */}
                       <Box sx={{ width: { xs: '100%', sm: 'auto' }, textAlign: { xs: 'center', sm: 'left' } }}>
                          <Typography variant="body2" sx={{ borderTop: '1px solid #000', pt: 1, display: 'inline-block', fontSize: 'inherit' }}>
                             Prepared By: {quotationData.preparedBy || '................'}
                          </Typography>
                       </Box>

                       {/* Logos */}
                       <Box sx={{ display: 'flex', gap: { xs: 2, sm: 4 }, alignItems: 'center', order: { xs: 3, sm: 2 } }}> {/* Change order on small screens */}
                          <img src="/tc.png" alt="TC" style={{ height: '40px' }} />
                          <img src="/msquare.png" alt="M-SQUARE" style={{ height: '40px' }} />
                       </Box>

                       {/* Authorised Signatory */}
                       <Box sx={{ width: { xs: '100%', sm: 'auto' }, textAlign: 'center', order: { xs: 2, sm: 3 } }}> {/* Change order */}
                          <Typography variant="body2" sx={{ borderTop: '1px solid #000', pt: 1, display: 'inline-block', fontSize: 'inherit' }}>
                             Authorised Signatory
                          </Typography>
                       </Box>
                   </Box>
                </Paper>

                {/* Action Buttons */}
                 <Paper sx={{ p: 2, mt: 0 }}> {/* Wrap buttons in Paper */}
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }} // Stack buttons vertically on small screens
                        spacing={1} // Reduce spacing
                        justifyContent="center"
                        alignItems="center" // Center items when stacked
                    >
                        <Button fullWidth={window.innerWidth < 600} variant="contained" color="primary" onClick={handleSubmit} disabled={quotationData.items.length === 0 || editingItemIndex !== null}>Submit & New</Button>
                        <Button fullWidth={window.innerWidth < 600} variant="contained" color="secondary" onClick={exportToPDF} disabled={quotationData.items.length === 0 || editingItemIndex !== null}>Export PDF</Button>
                        <Button fullWidth={window.innerWidth < 600} variant="contained" color="success" onClick={exportToExcel} disabled={quotationData.items.length === 0 || editingItemIndex !== null}>Export Excel</Button>
                        <Button fullWidth={window.innerWidth < 600} variant="outlined" startIcon={<UploadFileIcon />} onClick={() => fileInputRef.current?.click()} disabled={editingItemIndex !== null}>Upload PDF</Button>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf" style={{ display: 'none' }} />
                    </Stack>
                 </Paper>

                <Dialog open={clearItemsOpen} onClose={() => setClearItemsOpen(false)} aria-labelledby="clear-items-title">
                    <DialogTitle id="clear-items-title">Clear all items?</DialogTitle>
                    <DialogContent><DialogContentText>This removes all {quotationData.items.length} items. Your customer and quotation details will be kept. This cannot be undone.</DialogContentText></DialogContent>
                    <DialogActions>
                        <Button autoFocus onClick={() => setClearItemsOpen(false)}>Keep items</Button>
                        <Button color="error" variant="contained" onClick={clearItems}>Clear all items</Button>
                    </DialogActions>
                </Dialog>
                {/* ... (Keep Snackbar) ... */}
                 <Snackbar
                    open={snackbar.open}
                    autoHideDuration={4000} // Shorter duration
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} // Center snackbar
                    >
                    <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ width: '100%' }}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Container>
        </>
    );
}


// ... (Keep App component) ...
import { SelectChangeEvent } from '@mui/material/Select'; // Import SelectChangeEvent

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(Cookies.get('auth') === 'true');

  const handleLogin = () => {
    Cookies.remove('auth'); // Remove existing potentially invalid cookie
    Cookies.set('auth', 'true', { expires: 1 }); // Set cookie for 1 day
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
               {/* Pass handleLogout to QuotationApp if needed */}
               <QuotationApp /* onLogout={handleLogout} */ />
            </ProtectedRoute>
          }
        />
         {/* Optional: Redirect root to login if not authenticated */}
         {/* <Route path="/" element={isAuthenticated ? <Navigate to="/quote" /> : <Navigate to="/login" />} /> */}
         {/* <Route path="/quote" element={<ProtectedRoute isAuthenticated={isAuthenticated}><QuotationApp /></ProtectedRoute>} /> */}
      </Routes>
    </Router>
  );
}


export default App;