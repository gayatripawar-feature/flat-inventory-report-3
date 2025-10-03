import React, { useState, useEffect } from "react";
import {
  Typography, Box, Grid, Card, Drawer, CardContent, Button, Modal, TextField, MenuItem, Table,
  TableBody, TableCell, TableHead, TableRow, useMediaQuery, useTheme,
} from "@mui/material";
import { Select} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import { Snackbar, Alert } from "@mui/material";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
// import XLSX from "xlsx-style";
import ExcelJS from "exceljs";


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
      const res = await fetch("/api/flats");
      let data = await res.json();
      const now = new Date();

      data = await Promise.all(
        data.map(async (f) => {
          // Convert timestamp
          // if (f.timestamp) {
          //   const tsUTC = new Date(f.timestamp);
          //   f.timestamp_ist = tsUTC.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
          // }

          //     const tsIST = new Date(f.updated_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
          // alert(`Timestamp (IST): ${tsIST} and Hold Until: ${f.hold_until}`);



          if (f.status === "hold" && f.hold_until) {
            // Parse hold_until as UTC
            //   const holdUntil = new Date(f.hold_until + "Z");
            const holdUntil = new Date(f.hold_until);
            console.log(
              "Checking flat:", f.flat_key,
              "hold_until (UTC):", holdUntil.toISOString(),
              "now (local):", now.toISOString()
            );

            // If hold expired, update backend & local state
            if (holdUntil < now) {
              console.log("Hold expired, updating backend:", f.flat_key);

              try {
                await fetch(`/api/flats/${f.flat_key}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    status: "unsold",
                    date: f.booking_date || null,
                    hold_until: null,
                    agreementvalue: f.agreementvalue || null,
                    saleablearea: f.saleablearea || null,
                    cost: f.cost || null,
                  }),
                });

                // Update locally
                f.status = "unsold";
                f.hold_until = null;
              } catch (err) {
                console.error("Error updating flat after hold expired:", f.flat_key, err);
              }
            }
          }

          return f;
        })
      );

      // Build flatStatus map for UI
      const statusMap = {};
      data.forEach((f) => {
        statusMap[f.flat_key] = {
          status: f.status,
          date: f.booking_date || "",
          hold_until: f.hold_until,
        };
      });

      // Update state
      // Sort descending by updated_at
data.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

      setFlats(data);
      setFlatStatus(statusMap);
    } catch (err) {
      console.error("Error fetching flats:", err);
    }
  };

  useEffect(() => {
    fetchFlats(); // run on mount
    const interval = setInterval(fetchFlats, 5000);
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
    agreementvalue: "",
    saleablearea: "",
    cost: "",
    flat_type:"",
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

const handleBHKChange = (flatKey, newBHK) => {
  setFlats((prevFlats) =>
    prevFlats.map((flat) =>
      flat.flat_key === flatKey ? { ...flat, bhk: newBHK } : flat
    )
  );
};

  //  Flat with updation of dont shows the modal for the sold and landonwer:
  // Handle Flat Click → Open Modal
  const handleFlatClick = (flat, wing) => {
    const flatKey = getFlatKey(flat, wing);
    const currentStatus = flatStatus[flatKey]?.status || "unsold";
    //  If sold or landowner, do not open modal
    if (currentStatus === "sold") {
      setToast({
        open: true,
        message: `Flat ${flat} is already SOLD and cannot be updated.`,
        severity: "info",
      });
      return;
    }

    if (currentStatus === "landowner") {
      setToast({
        open: true,
        message: `Flat ${flat} is Booked and cannot be updated.`,
        severity: "info",
      });
      return;
    }

    const currentDate = flatStatus[flatKey]?.date || "";
    setSelectedFlat({ flat, wing, flatKey });
    setFormData({ status: currentStatus, date: currentDate });
    setOpenModal(true);
  };


  const isFieldRequired = (field) => {
    if (formData.status === "sold") {
      // All fields required
      return ["date", "flat_type", "agreementvalue", "saleablearea", "cost"].includes(field);
    } else if (formData.status === "hold") {
      // All except date
      return ["flat_type","agreementvalue", "saleablearea", "cost"].includes(field);
    }
    return false; // for unsold/other statuses
  };



  const handleSave = async () => {
    if (!selectedFlat) return;

    // Validation
    if (formData.status === "sold") {
      if (!formData.date || !formData.flat_type ||  !formData.agreementvalue || !formData.saleablearea) {
        setToast({
          open: true,
          message: "All fields are required for Sold status!",
          severity: "error",
        });
        return;
      }
    } else if (formData.status === "hold") {
      if (!formData.agreementvalue || !formData.saleablearea || !formData.flat_type) {
        setToast({
          open: true,
          message: "All fields except booking date are required for Hold status!",
          severity: "error",
        });
        return;
      }
    }

    try {
      let payload = {
        status: formData.status,
        date: formData.date || null,
        agreementvalue: formData.agreementvalue || null,
        saleablearea: formData.saleablearea || null,
        cost: formData.cost || null,
         flat_type: formData.flat_type || null, 
        hold_until: null,
      };

      if (formData.status === "hold") {
        // Set hold for 10 seconds in UTC
        // const holdUntil = new Date(Date.now() + 10 * 1000);   
        //  For 1 hour 
        const holdUntil = new Date(Date.now() + 1 * 60 * 60 * 1000);
        payload.hold_until = holdUntil.toISOString().slice(0, 19).replace("T", " ");
        // YYYY-MM-DD HH:MM:SS format in UTC
      }

      console.log("Saving flat:", selectedFlat.flatKey);
      console.log("Payload for save:", payload);

      const res = await fetch(`/api/flats/${selectedFlat.flatKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      // Update frontend immediately
      setFlatStatus(prev => ({
        ...prev,
        [selectedFlat.flatKey]: {
          status: formData.status,
          date: formData.date || "",
          hold_until: payload.hold_until,
        },
      }));

      setOpenModal(false);
      setToast({
        open: true,
        message:
          formData.status === "hold"
            ? "Flat put on hold for 1 hour!"
            : result.message,
        severity: formData.status === "hold" ? "info" : "success",
      });
    } catch (err) {
      console.error("Error updating flat:", err);
      setToast({
        open: true,
        message: "Failed to save flat",
        severity: "error",
      });
    }
  };


  // First:
  const formatDateTime = (isoString) => {
    if (!isoString) return "-";

    // const date = new Date();
    const date = new Date(isoString);

    const options = {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    };

    return new Intl.DateTimeFormat("sv-SE", options).format(date);
  };


  const formatDateOnly = (isoString) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    // Get local date in 'YYYY-MM-DD' format
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };


  // const downloadCSV = () => {
  //   if (!flats.length) {
  //     alert("No data to export!");
  //     return;
  //   }

  //   // Define headers
  //   const headers = [
  //     "Timestamp",
  //     "Booking Date",
  //     "Wing",
  //     "Flat No",
  //     "Floor",
  //     "Status",
  //     "Agreement Value (Rs)",
  //     "Saleable Area",
  //     "Cost / Sq.ft",
  //   ];

  //   const rows = flats.map(flat => [
  //     flat.updated_at ? formatDateTime(flat.updated_at) : "-",
  //     // flat.booking_date ? formatDateTime(flat.booking_date) : "-",
  //     flat.booking_date ? formatDateOnly(flat.booking_date) : "-",
  //     flat.wing || "-",
  //     flat.flat_number || "-",
  //     flat.flat_number ? flat.flat_number.substring(0, 1) : "-",
  //     flat.status || "-",
  //     flat.agreementvalue || "-",
  //     flat.saleablearea || "-",
  //     flat.cost || "-"
  //   ]);


  //   // Combine header + rows
  //   const csvContent = [headers, ...rows]
  //     .map(e => e.join(",")) // join each row with commas
  //     .join("\n"); // join rows with newline

  //   // Create a downloadable blob
  //   const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  //   const url = URL.createObjectURL(blob);

  //   // Create link and click
  //   const link = document.createElement("a");
  //   link.href = url;
  //   link.setAttribute("download", "Elara_Inventory_Report.csv");
  //   document.body.appendChild(link);
  //   link.click();
  //   document.body.removeChild(link);
  // };






const downloadExcel = () => {

  // SOLD UNITS and 2 BHK are dynamic columns . and 
  // totalUnitsInProject and Sanctionunit and Nonsanctioned and NoOfUnitsToSell and LANDOWNERS FLATS and 3 BHK are static values 
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Project Inventory");



  sheet.addRow([]);

sheet.mergeCells("A1:M1");
const titleCell = sheet.getCell("A1");
titleCell.value = "PROJECT INVENTORY SUMMARY";
titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F81BD" } };
titleCell.alignment = { horizontal: "center", vertical: "middle" };

sheet.addRow([]);
const totalWings = 7;  
const flatsPerWing = 28;
const totalUnitsInProject = totalWings * flatsPerWing; // 196
console.log("Total flats:", totalUnitsInProject);
const Sanctionunit = 84;

const sanctioned2BHK = 84;
const sanctioned3BHK = 0;

const totalSanctioned = sanctioned2BHK + sanctioned3BHK;
const Nonsanctioned = totalUnitsInProject - totalSanctioned;


const landownersFlats = 19;
// const landonwners2BHKFlats =18;
const landowners3BHKFlats = 0;
const landowners2BHKCalculated = landownersFlats - landowners3BHKFlats;
const NoOfUnitsToSell = Sanctionunit-landownersFlats;
const availableUnitsForSale = Sanctionunit-landownersFlats;

const nonSanctioned3BHKManual = 14; // Your specified value
const nonSanctioned2BHKCalculated = Nonsanctioned - nonSanctioned3BHKManual;


// Calculate summary
const summary = {
  "2 BHK": { sanctioned: 0, nonSanctioned: 0, total: 0 },
  "3 BHK": { sanctioned: 0, nonSanctioned: 0, total: 0 },
  "UNITS FOR SALE": 0,
  "SANCTIONED UNITS": 0,
  "SOLD UNITS": 0,
};


flats.forEach(flat => {
  const bhk = flat.bhk ? flat.bhk.toUpperCase().trim() : "OTHER";
  const bhkCategory = bhk.includes("2BHK") ? "2 BHK" : bhk.includes("3BHK") ? "3 BHK" : null;
  // BHK-wise counts (only if BHK is 2BHK or 3BHK)
  if (bhkCategory) {
    summary[bhkCategory].total++;

    const statusBHK = flat.status ? flat.status.toLowerCase().trim() : "";
    // if (statusBHK === "sold" || statusBHK === "hold") {
    //   summary[bhkCategory].sanctioned++;
    // } else {
    //   summary[bhkCategory].nonSanctioned++;
    // }
  }

  // Overall counts (all flats, ignore BHK)
  const statusOverall = flat.status ? flat.status.toLowerCase().trim() : "";
  if (statusOverall === "sold") summary["SOLD UNITS"]++;
  if (statusOverall === "sold" || statusOverall === "hold") summary["SANCTIONED UNITS"]++;
  else summary["UNITS FOR SALE"]++;
  

//   summary["2 BHK"].sanctioned = 84;  // fixed
// summary["3 BHK"].sanctioned = 0;
});



  console.log("Sold Units Count:", summary["SOLD UNITS"]);
const sold2BHK = summary["2 BHK"].sanctioned; 
const sold3BHK = summary["3 BHK"].sanctioned;

const totalAvailable2BHK = availableUnitsForSale - summary["SOLD UNITS"];

const totalAvailable3BHK = 0;

const bookedFlatsCount = flats.filter(flat => flat.status && flat.status.toLowerCase() === "booked").length;

const unitsForSale2BHK = NoOfUnitsToSell; 

const unitsForSale3BHK = sanctioned3BHK - landowners3BHKFlats;


// const availableUnits2BHK = unitsForSale2BHK - summary["SOLD UNITS"];

// const availableUnits3BHK = unitsForSale3BHK - sold3BHK;

// flat type:
let sold2BHKCount = 0;
let sold3BHKCount = 0;




// flats.forEach(flat => {
//   // Use flat_type instead of bhk
//   const bhk = flat.flat_type ? flat.flat_type.toUpperCase().replace(/\s+/g, "") : "";
//   const status = flat.status ? flat.status.toLowerCase().trim() : "";

//   if (status === "sold") {
//     if (bhk.includes("2BHK")) sold2BHKCount++;
//     else if (bhk.includes("3BHK")) sold3BHKCount++;
//   }
// });
flats.forEach(flat => {
  // Use flat_type instead of bhk
  let bhk = flat.flat_type ? flat.flat_type.toUpperCase().replace(/\s+/g, "") : "";

  // If flat_type is missing, default to 2BHK or 3BHK
  if (!bhk) {
    // Default logic: e.g., most flats are 2BHK if type missing
    bhk = "2BHK"; 
  }

  const status = flat.status ? flat.status.toLowerCase().trim() : "";

  if (status === "sold") {
    if (bhk.includes("2BHK")) sold2BHKCount++;
    else if (bhk.includes("3BHK")) sold3BHKCount++;
  }

//   if (status === "sold" || status === "hold") {
//     if (bhk.includes("2BHK")) sold2BHKCount++;
//     else if (bhk.includes("3BHK")) sold3BHKCount++;
// }

});
console.log("Sold 2BHK:", sold2BHKCount, "Sold 3BHK:", sold3BHKCount);


const availableUnits2BHK = unitsForSale2BHK - sold2BHKCount;

const availableUnits3BHK = unitsForSale3BHK - sold3BHKCount;
sheet.mergeCells("A2:A3"); // TOTAL UNITS IN PROJECT

// Columns where we will add sub-columns
sheet.mergeCells("B2:C2"); // SANCTIONED UNITS (will span B2:C2)
sheet.mergeCells("D2:E2"); // NON-SANCTIONED FLATS
sheet.mergeCells("F2:G2"); // UNITS FOR SALE
sheet.mergeCells("H2:I2"); // LANDOWNERS FLATS

sheet.mergeCells("J2:K2"); // SOLD UNITS (existing)
sheet.mergeCells("L2:M2"); // AVAILABLE UNITS FOR SALE (existing)
// sheet.mergeCells("N2:O2"); // FLATS AVAILABLE FOR SALE (existing)


// Row 2: Top headers
const headerTop = sheet.getRow(2);

sheet.getCell("A2").value = "TOTAL UNITS IN PROJECT";
sheet.getCell("B2").value = "SANCTIONED UNITS";
sheet.getCell("D2").value = "NON-SANCTIONED FLATS";
sheet.getCell("F2").value = "LANDOWNERS FLATS";
sheet.getCell("H2").value = "UNITS FOR SALE";
sheet.getCell("J2").value = "SOLD UNITS";
sheet.getCell("L2").value = "AVAILABLE UNITS FOR SALE";

sheet.getCell("B3").value = "2 BHK";
sheet.getCell("C3").value = "3 BHK";


sheet.getCell("D3").value = "2 BHK";
sheet.getCell("E3").value = "3 BHK";


sheet.getCell("F3").value = "2 BHK";
sheet.getCell("G3").value = "3 BHK";


sheet.getCell("H3").value = "2 BHK";
sheet.getCell("I3").value = "3 BHK";

// Sub-columns for SOLD UNITS (already exists)
sheet.getCell("J3").value = "2 BHK";
sheet.getCell("K3").value = "3 BHK";

// Sub-columns for AVAILABLE UNITS FOR SALE
sheet.getCell("L3").value = "2 BHK";
sheet.getCell("M3").value = "3 BHK";


headerTop.eachCell(cell => {
  cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F81BD" } };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" },
  };
});


const headerBottom = sheet.getRow(3);
headerBottom.eachCell(cell => {
    // This will style F3, G3, I3, J3
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F81BD" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
    };
});


const dataRow = sheet.addRow([
  totalUnitsInProject,        // A: TOTAL UNITS IN PROJECT
//  Sanctionunit,  // B: SANCTIONED 2 BHK
//   Nonsanctioned, // C: SANCTIONED 3 BHK
sanctioned2BHK,             // B: 2 BHK sanctioned
  sanctioned3BHK, 
  nonSanctioned2BHKCalculated, // D: NON-SANCTIONED 2 BHK
  nonSanctioned3BHKManual,     // E: NON-SANCTIONED 3 BHK
  landowners2BHKCalculated,    // F: LANDOWNERS 2 BHK
  landowners3BHKFlats,         // G: LANDOWNERS 3 BHK
  unitsForSale2BHK,            // H: UNITS FOR SALE 2 BHK
  unitsForSale3BHK,            // I: UNITS FOR SALE 3 BHK
  // sold2BHK,                     // J: SOLD UNITS 2 BHK

  // summary["SOLD UNITS"],
  // sold3BHK,                     // K: SOLD UNITS 3 BHK
 sold2BHKCount,
  sold3BHKCount,
  
  availableUnits2BHK,           // L: AVAILABLE UNITS 2 BHK
  availableUnits3BHK,           // M: AVAILABLE UNITS 3 BHK
  // totalAvailable2BHK,           // N: FLATS AVAILABLE 2 BHK
  // totalAvailable3BHK            // O: FLATS AVAILABLE 3 BHK
]);

dataRow.eachCell(cell => {
  cell.alignment = { horizontal: "center", vertical: "middle" ,indent: 2 };
  cell.border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" },
  };
});

sheet.addRow([]); // spacing


sheet.addRow([]); // spacing before next table

  // -----------------------------
  // 4️⃣ Flat Inventory Details
  // -----------------------------
  const startRow = sheet.lastRow.number + 1;
  sheet.mergeCells(`A${startRow}:I${startRow}`);
  const detailsTitleCell = sheet.getCell(`A${startRow}`);
  detailsTitleCell.value = "FLAT INVENTORY DETAILS";
  detailsTitleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  detailsTitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F81BD" } };
  detailsTitleCell.alignment = { horizontal: "center", vertical: "middle" };

  sheet.addRow([]);

  const headers = ["Timestamp","BookindDate","Flat No","Flat Type" ,"Wing","Status","Agreement Value","Saleable Area","Cost/Sq.ft"];
  const detailsHeaderRow = sheet.addRow(headers);
  detailsHeaderRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF808080" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Flat data rows
  flats.forEach(flat => {
    const row = sheet.addRow([
      flat.updated_at ? formatDateTime(flat.updated_at) : "-",
    flat.booking_date ? formatDateOnly(flat.booking_date) : "-",
      flat.flat_number || "-",
      flat.flat_type || "-",
      flat.wing || "-",
     
      flat.status || "-",
     flat.agreementvalue || "-",
     flat.saleablearea || "-",
      flat.cost || "-"
    ]);
    row.eachCell(cell => {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  // Column widths
  const columnWidths = [12, 12, 10, 15, 20, 18, 15];
  sheet.columns.forEach((col, i) => { col.width = columnWidths[i]; });

  // -----------------------------
  // Save Excel
  // -----------------------------
  workbook.xlsx.writeBuffer().then(buffer => {
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, "ProjectInventory.xlsx");
  });
};

  return (
    <Box sx={{ p: 0 }}>

      <Box sx={{ width: "100%", bgcolor: "#802026ff", py: 1, mb: 5 }}>
        <Grid container alignItems="center" justifyContent="space-between" sx={{ px: { xs: 2, md: 2 } }}>
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
              Elara Flat Inventory Report
            </Typography>
          </Grid>



          <Grid item xs={12} md={6} sx={{ mt: { xs: 2, md: 0 }, display: "flex", justifyContent: { xs: "center", md: "flex-end" }, gap: 2, flexWrap: "wrap" }}>


            <Button
              variant="contained"
              sx={{
                background: "linear-gradient(135deg, #ff416c, #ff4b2b)", // Pink → Red
                "&:hover": { background: "linear-gradient(135deg, #ff5e75, #ff5722)" },
                color: "#fff",
              }}
              onClick={() => setDrawerOpen(true)}
            >
              Check Detailed Report analysis
            </Button>

            <Button
              variant="contained"
              color="success"
              // sx={{ bgcolor: "#4caf50", "&:hover": { bgcolor: "#43a047" } }}
              sx={{
                background: "linear-gradient(135deg, #ff416c, #ff4b2b)", // Pink → Red
                "&:hover": { background: "linear-gradient(135deg, #ff5e75, #ff5722)" },
                color: "#fff",
              }}
              onClick={downloadExcel}
            >
              Download CSV
            </Button>
          </Grid>
          {/* )} */}
        </Grid>
      </Box>


      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" }, //  on mobile
          alignItems: { xs: "stretch", md: "center" },
          mb: 5,
          px: { xs: 2, md: 1 }, // To reduce right padding on desktop
          gap: { xs: 2, md: 3 },
          ml: { xs: 0, md: -2 }, // To shift the whole section slightly left on desktop
        }}
      >


        <Card
          sx={{
            minWidth: 126,
            bgcolor: "#ff4b2b",
            color: "#fff",
            p: 0,
            ml: 3,
            animation: "pulse 2s infinite",
            transformOrigin: "top center",

            "@keyframes pulse": {
              "0%": { transform: "scale(1)", boxShadow: "0 0 0 rgba(0,0,0,0.2)" },
              "50%": { transform: "scale(1.05)", boxShadow: "0 0 15px rgba(255,75,43,0.6)" },
              "100%": { transform: "scale(1)", boxShadow: "0 0 0 rgba(0,0,0,0.2)" },
            },
          }}
        >
          <CardContent sx={{ pt: 3, pb: 2 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 0, lineHeight: 1 }}>
              ₹ {" "}
              {(() => {
                const soldFlats = flats.filter(
                  (f) => f.status?.toLowerCase() === "sold" && f.cost
                );
                const totalCost = soldFlats.reduce(
                  (sum, f) => sum + Number(f.cost || 0),
                  0
                );
                return soldFlats.length
                  ? (totalCost / soldFlats.length).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                  : 0;
              })()}
            </Typography>
          </CardContent>
        </Card>

        <Box sx={{ flex: 1, display: "flex", justifyContent: "center", gap: 3 }}>
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
                {status === "landowner" ? "Booked" : status}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>




      {/* Card + Wings in one row */}
    <Grid container spacing={4} alignItems="flex-start" justifyContent="center">


        {/* Wings on the right */}
        {Object.keys(wings).map((wing) => (
          <Grid item xs={12} md={3} key={wing}  >
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
            // width: 350,
            width: { xs: "90%", sm: 350 },

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
            // label="Date of Booking"
            label={`Date of Booking${isFieldRequired("date") ? " *" : ""}`}
            type="date"
            fullWidth
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />



          <TextField
  select
  label={`Flat Type${isFieldRequired("flat_type") ? " *" : ""}`}
  fullWidth
  value={formData.flat_type|| ""} // use flatType from formData
  onChange={(e) => setFormData({ ...formData, flat_type: e.target.value })}
  sx={{ mb: 2 }}
>
  <MenuItem value="2 BHK">2 BHK</MenuItem>
  <MenuItem value="3 BHK">3 BHK</MenuItem>
</TextField>

          <TextField
            // label="Agreement Value (in Rs)"
            label={`Agreement Value (in Rs)${isFieldRequired("agreementvalue") ? " *" : ""}`}
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
            // label="Saleable Area"
            label={`Saleable Area${isFieldRequired("saleablearea") ? " *" : ""}`}
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
            // label="Cost sq/ft"
            label={`Cost sq/ft${isFieldRequired("cost") ? " *" : ""}`}
            type="number"
            fullWidth
            value={formData.cost}
            InputLabelProps={{ shrink: true }}
            sx={{
              mb: 2,
              fontWeight: "bold",   // makes it bold
              color: "black",       // ensure visibility
              fontSize: "16px"
            }}
          // disabled // make it read-only since it's auto-calculated

          />

          <TextField
            select
            // label="Status"
            label={`Status${isFieldRequired("status") ? " *" : ""}`}
            fullWidth
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            sx={{ mb: 2 }}
          >
            <MenuItem value="unsold">Unsold</MenuItem>
            <MenuItem value="sold">Sold</MenuItem>
            <MenuItem value="hold">Hold</MenuItem>
            {/* <MenuItem value="landowner">Landowner</MenuItem> */}
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
        // PaperProps={{ sx: { width: 1000, p: 3 } }}
        PaperProps={{
          sx: {
            width: { xs: "95%", sm: 700, md: 1000 }, // responsive width
            p: 2,
          },
        }}
      >
        <IconButton
          onClick={() => setDrawerOpen(false)}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            color: "#000", // change color if needed
          }}
        >
          <CloseIcon />
        </IconButton>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Flat Inventory Allotment Report
        </Typography>
        <Box sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#800020" }}>
                <TableCell sx={{ color: "#fff" }}><strong>Timestamp</strong></TableCell>
                <TableCell sx={{ color: "#fff" }}><strong>Booking Date</strong></TableCell>
                <TableCell sx={{ color: "#fff" }}><strong>Wing</strong></TableCell>
                <TableCell sx={{ color: "#fff" }}><strong>Flat No</strong></TableCell>
                <TableCell sx={{ color: "#fff" }}><strong>Flat Type</strong></TableCell>
                <TableCell sx={{ color: "#fff" }}><strong>Floor</strong></TableCell>
                <TableCell sx={{ color: "#fff" }}><strong>Status</strong></TableCell>
                <TableCell sx={{ color: "#fff" }}><strong>Agreement Value (Rs)</strong></TableCell>
                <TableCell sx={{ color: "#fff" }}><strong>Saleable Area</strong></TableCell>
                <TableCell sx={{ color: "#fff" }}><strong>Cost / Sq.ft</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {flats.map((flat) => (
                <TableRow key={flat.flat_key}>
                  {/* <TableCell>{flat.updated_at}</TableCell> */}

                  <TableCell>{new Date(flat.updated_at).toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}</TableCell>
                  {/* <TableCell>{formatDateTime(flat.booking_date)}</TableCell> */}
                  <TableCell>{flat.booking_date || "-"}</TableCell>


                  <TableCell>{flat.wing}</TableCell>
                  <TableCell>{flat.flat_number}</TableCell>
                <TableCell>{flat.flat_type || "-"}</TableCell> 
                  <TableCell>{flat.flat_number?.substring(0, 1)}</TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: "inline-block",
                        px: 2,
                        py: 0.5,
                        borderRadius: "12px",
                        // bgcolor: getStatusColor(flat.status),
                        bgcolor: statusColors[flat.status] || "#9e9e9e",
                        // color: "#fff",
                        color: flat.status === "unsold" || !flat.status ? "#000" : "#fff",
                        fontWeight: "bold",
                        textTransform: "capitalize",
                      }}
                    >
                      {/* {flat.status} */}
                      {flat.status === "landowner" ? "Booked" : flat.status}
                    </Box>
                  </TableCell>
                  <TableCell>{flat.agreementvalue || "-"}</TableCell>
                  <TableCell>{flat.saleablearea || "-"}</TableCell>
                  <TableCell>{flat.cost || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Drawer>
    </Box>
  );
};

export default FlatInventory;


