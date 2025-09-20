import React, { useState,useEffect } from "react";
import {
  Typography,
  Box,
  Grid,
  Card,
  Drawer,
  CardContent,
  Button,
  Modal,
  TextField,
  MenuItem,
 Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  useMediaQuery, useTheme
} from "@mui/material";
import { Snackbar, Alert } from "@mui/material";
const FlatInventory = () => {
  const wings = {
    "Wing A": [
      ["101", "102", "103", "104"],
      ["201", "202", "203", "204"],
      ["301", "302", "303", "304"],
      ["401", "402", "403", "404"],
      ["501", "502", "503", "504"],
      ["601", "602", "603", "604"],
      ["701", "702", "703", "704"],
    ],
    "Wing B": [
      ["101", "102", "103", "104"],
      ["201", "202", "203", "204"],
      ["301", "302", "303", "304"],
      ["401", "402", "403", "404"],
      ["501", "502", "503", "504"],
      ["601", "602", "603", "604"],
      ["701", "702", "703", "704"],
    ],
    "Wing C": [
      ["101", "102", "103", "104"],
      ["201", "202", "203", "204"],
      ["301", "302", "303", "304"],
      ["401", "402", "403", "404"],
      ["501", "502", "503", "504"],
      ["601", "602", "603", "604"],
      ["701", "702", "703", "704"],
    ],
  };


const fetchFlats = async () => {
  try {
    // --localhost
    // const res = await fetch("http://localhost:5000/api/flats");   
    
// netlify :
    const res = await fetch("/api/flats");                              

    let data = await res.json();
    const now = new Date();

    data = data.map(f => {
      if (f.status === "hold" && f.hold_until) {
        const holdUntil = new Date(f.hold_until);
        if (holdUntil < now) {
          f.status = "unsold"; // for expired flats
          f.hold_until = null;
        }
      }
      return f;
    });

    const statusMap = {};
    data.forEach(f => {
      statusMap[f.flat_key] = {
        status: f.status,
        date: f.booking_date || "",
        holdUntil: f.hold_until
      };
    });
     setFlats(data);
    setFlatStatus(statusMap);
   } catch (err) {
    console.error("Error fetching flats:", err);
  }
};

useEffect(() => {
  fetchFlats(); // run on mount
    const interval = setInterval(fetchFlats, 10000);
    return () => clearInterval(interval); // cleanup on unmount
}, []);

  // ✅ Keep statuses in state (all flats start as unsold)
  const [flatStatus, setFlatStatus] = useState({});
  const [openModal, setOpenModal] = useState(false);
  const [selectedFlat, setSelectedFlat] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
   const [flats, setFlats] = useState([]);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md")); // Desktop screens
const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
const [formData, setFormData] = useState({
    date: "",
    status: "unsold",
    agreementvalue:" ",
    saleablearea:" ",
    cost:" ",
});
 // Get flat key like "101A"
  const getFlatKey = (flat, wingName) => flat + wingName.slice(-1);
// Status colors
  const statusColors = {
    unsold: "#fff", // white
    sold: "#46e934ff", // green
    hold: "#fbf053ff", // yellow
    landowner: "#fd7d0dff", // orange
  };
// Handle Flat Click → Open Modal
  const handleFlatClick = (flat, wing) => {
    const flatKey = getFlatKey(flat, wing);
    const currentStatus = flatStatus[flatKey]?.status || "unsold";
    const currentDate = flatStatus[flatKey]?.date || "";
    setSelectedFlat({ flat, wing, flatKey });
    setFormData({ status: currentStatus, date: currentDate });
    setOpenModal(true);
  };
// Save Flat Data
  const handleSave = async () => {
  if (!selectedFlat) return;
  try {
    let payload = { status: formData.status, date: formData.date };
     if (formData.status === "hold") {
      // const holdUntil = new Date(Date.now() + 60 * 1000); // 1 min hold
      const holdUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour hold
      // Convert to local MySQL-friendly format
      const localDateTime = holdUntil.toLocaleString("sv-SE", { hour12: false }).replace(" ", "T");
      payload.holdUntil = localDateTime;
    } else {
      payload.holdUntil = null;
    }
    const res = await fetch(`/api/flats/${selectedFlat.flatKey}`, {
    // localhost:
    // const res = await fetch(`http://localhost:5000/api/flats/${selectedFlat.flatKey}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
   // Update state immediately so color changes
    setFlatStatus(prev => ({
      ...prev,
      [selectedFlat.flatKey]: {
        status: formData.status,
        date: formData.date,
        holdUntil: payload.holdUntil
      }
    }));
  setOpenModal(false);
  setToast({
      open: true,
      message: formData.status === "hold" ? "Flat put on hold for 1 hour!" : result.message,
      severity: formData.status === "hold" ? "info" : "success",
    });

  } catch (err) {
    console.error("Error updating flat:", err);
    setToast({ open: true, message: "Failed to save flat", severity: "error" });
  }
};

// Status colors
  const getStatusColor = (status) => {
    switch (status) {
      case "sold":
        return "#3ca940ff"; // green
      case "hold":
        return "#fbf053ff"; // orange
      case "landowner":
        return "#f44336"; // red
      default:
        return "#9e9e9e"; // gray
    }
  };



  // Format ISO date string → "YYYY-MM-DD HH:mm:ss"
const formatDateTime = (isoString) => {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return date.toISOString().slice(0, 19).replace("T", " ");
};




  return (
    <Box sx={{ p: 1 }}>
      
  <Box sx={{ width: "100%", bgcolor: "#802026ff", py: 2, px: 2 ,mb:5}}>
      <Grid container alignItems="center" justifyContent="space-between">
        {/* Title */}
        <Grid item xs={12} md={6}>
          <Typography
            variant="h4"
            fontWeight="bold"
            sx={{
              color: "#fff",
              textAlign: { xs: "center", md: "left" },
            }}
          >
            Elara Inventory Report
          </Typography>
        </Grid>

        {/* Button only on desktop */}
        {isDesktop && (
          <Grid item sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              color="secondary"
              sx={{ bgcolor: "#ff9800", "&:hover": { bgcolor: "#fb8c00" } }}
              onClick={() => setDrawerOpen(true)}
            >
              Check Detailed Report
            </Button>
             
          </Grid>
        )}
      </Grid>
    </Box>
      {/* Legend */}
      <Box sx={{ display: "flex", justifyContent: "center", gap: 3, mb: 4 }}>
        {Object.entries(statusColors).map(([status, color]) => (
          <Box key={status} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 20,
                height: 20,
                backgroundColor: color,
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            />
            <Typography variant="body1" sx={{ textTransform: "capitalize" }}>
              {status}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Wings */}
      {/* <Grid container spacing={8}> */}
      <Grid container spacing={4} justifyContent="center">
        {Object.keys(wings).map((wing) => (
          <Grid item xs={12} md={4} key={wing}>
            <Card sx={{ boxShadow: 3 }}>
              <CardContent>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  textAlign="center"
                  mb={2}
                >
                  {wing}
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {wings[wing].map((row, rowIndex) => (
                    <Box
                      key={rowIndex}
                      sx={{
                        display: "flex",
                        gap: 1,
                        justifyContent: "center",
                      }}
                    >
                      {row.map((flat) => {
                        const flatKey = getFlatKey(flat, wing);
                        const status = flatStatus[flatKey]?.status || "unsold";
                        return (
                          <Button
                            key={flat}
                            variant="contained"
                            onClick={() => handleFlatClick(flat, wing)}
                            sx={{
                              minWidth: 60,
                              height: 40,
                              backgroundColor: statusColors[status],
                              border: "1px solid #ccc",
                              color: status === "unsold" ? "black" : "white",
                              "&:hover": {
                                backgroundColor: statusColors[status],
                                opacity: 0.85,
                              },
                            }}
                          >
                            {flat}
                          </Button>
                        );
                      })}
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Modal */}
      <Modal open={openModal} onClose={() => setOpenModal(false)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 350,
            bgcolor: "background.paper",
            boxShadow: 24,
            borderRadius: 2,
            p: 3,
          }}
        >
          <Typography variant="h6" mb={2}>
            Update Flat : {selectedFlat?.flat} ({selectedFlat?.wing})
          </Typography>

          <TextField
            label="Date of Booking"
            type="date"
            fullWidth
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />

          <TextField
      label="Agreement Value (in Rs)"
      type="number"
      fullWidth
      value={formData.agreementvalue}
      onChange={(e) => {
        const newAgreementValue = e.target.value;
        const cost =
          formData.saleablearea > 0
            ? (newAgreementValue / formData.saleablearea).toFixed(2)
            : "";
        setFormData({
          ...formData,
          agreementvalue: newAgreementValue,
          cost,
        });
      }}
      InputLabelProps={{ shrink: true }}
      sx={{ mb: 2 }}
    />
          <TextField
      label="Saleable Area"
      type="number"
      fullWidth
      value={formData.saleablearea}
      onChange={(e) => {
        const newSaleableArea = e.target.value;
        const cost =
          newSaleableArea > 0
            ? (formData.agreementvalue / newSaleableArea).toFixed(2)
            : "";
        setFormData({
          ...formData,
          saleablearea: newSaleableArea,
          cost,
        });
      }}
      InputLabelProps={{ shrink: true }}
      sx={{ mb: 2 }}
    />

     
    <TextField
      label="Cost sq/ft"
      type="number"
      fullWidth
      value={formData.cost}
      InputLabelProps={{ shrink: true }}
      sx={{ mb: 2 ,
        fontWeight: "bold",   // makes it bold
      color: "black",       // ensure visibility
      fontSize: "16px"
      }}
      // disabled // make it read-only since it's auto-calculated

    />
            
          <TextField
            select
            label="Status"
            fullWidth
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            sx={{ mb: 2 }}
          >
            <MenuItem value="unsold">Unsold</MenuItem>
            <MenuItem value="sold">Sold</MenuItem>
            <MenuItem value="hold">Hold</MenuItem>
            <MenuItem value="landowner">Landowner</MenuItem>
          </TextField>

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button variant="outlined" onClick={() => setOpenModal(false)}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSave}>
              Save
            </Button>
          </Box>
        </Box>
      </Modal>



      <Snackbar
  open={toast.open}
  autoHideDuration={3000}
  onClose={() => setToast({ ...toast, open: false })}
  anchorOrigin={{ vertical: "top", horizontal: "right" }}
>
  <Alert
    onClose={() => setToast({ ...toast, open: false })}
    severity={toast.severity}
    sx={{ width: "100%" }}
  >
    {toast.message}
  </Alert>
</Snackbar>



<Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 700, p: 3 } }}
      >
        <Typography variant="h6" fontWeight="bold" gutterBottom>
        Inventory Allotment Report
        </Typography>
        <Table>
          <TableHead>
            <TableRow sx={{backgroundColor:"#800020"}}>
              <TableCell sx={{color:"#fff"}}><strong>Timestamp</strong></TableCell>
              <TableCell sx={{color:"#fff"}}><strong>Booking Date</strong></TableCell>
              <TableCell sx={{color:"#fff"}}><strong>Wing</strong></TableCell>
              <TableCell sx={{color:"#fff"}}><strong>Flat No</strong></TableCell>
              <TableCell sx={{color:"#fff"}}><strong>Floor</strong></TableCell>
              <TableCell sx={{color:"#fff"}}><strong>Status</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {flats.map((flat) => (
              <TableRow key={flat.flat_key}>
              
                <TableCell>{formatDateTime(flat.updated_at)}</TableCell>
<TableCell>{formatDateTime(flat.booking_date)}</TableCell>

                <TableCell>{flat.wing}</TableCell>
                <TableCell>{flat.flat_number}</TableCell>
                <TableCell>{flat.flat_number?.substring(0, 1)}</TableCell>
                <TableCell>
                  <Box
                    sx={{
                      display: "inline-block",
                      px: 2,
                      py: 0.5,
                      borderRadius: "12px",
                      bgcolor: getStatusColor(flat.status),
                      color: "#fff",
                      fontWeight: "bold",
                      textTransform: "capitalize",
                    }}
                  >
                    {flat.status}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Drawer>
    </Box>
  );
};

export default FlatInventory;
