"use client";

import { useState } from "react";
import axios from "axios";
 import { jsPDF } from "jspdf";
 import QRCode from "qrcode";
 import html2canvas from "html2canvas";
import { 
  Search, CreditCard, Globe, Calendar, Hash, 
  CheckCircle2, XCircle, Clock, X, QrCode, ShieldAlert, 
  DollarSign, Tag, Smartphone, Database, Activity, User, FileCheck, Download, Mail
} from "lucide-react";

// 🌟 NEW: Import your destination data to map the country codes
import { allDestinations } from "@/data/destinationData";

// --- Helper for Date Formatting ---
const formatDate = (isoString) => {
  if (!isoString) return "N/A";
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', month: 'short', day: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  });
};

// --- Helper for Status Badges ---
const StatusBadge = ({ status, label = "" }) => {
  if (!status) return <span className="text-gray-400 text-xs">N/A</span>;
  const s = status.toString().toUpperCase();
  
  if (s === "COMPLETED" || s === "SUCCEEDED" || s === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-wider">
        <CheckCircle2 size={12} /> {label && <span className="text-green-600/80 mr-0.5">{label}:</span>} {s}
      </span>
    );
  }
  if (s === "PENDING" || s === "PROCESSING") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-orange-100 text-orange-700 uppercase tracking-wider">
        <Clock size={12} /> {label && <span className="text-orange-600/80 mr-0.5">{label}:</span>} {s}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-gray-100 text-gray-600 uppercase tracking-wider">
      <XCircle size={12} /> {label && <span className="text-gray-500 mr-0.5">{label}:</span>} {s}
    </span>
  );
};

export default function AdminUsersPanel() {
  const adminToken = localStorage.getItem("adminToken");
  const [emailInput, setEmailInput] = useState("");
  
  // States for API 1 (User Sims)
  const [userSims, setUserSims] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // States for API 2 (Sim Details Modal)
  const [selectedSim, setSelectedSim] = useState(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  // States for API 3 (CSV Export)
  const [isExporting, setIsExporting] = useState(false);

  // States for API 4 (Export ALL CSV)
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isExportingAll, setIsExportingAll] = useState(false);

  // 🌟 NEW: State for Sending Email
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // --- API 1: Fetch all SIMs for a user ---
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setIsSearching(true);
    setSearchError("");
    setHasSearched(true);
    setUserSims([]);

    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admin/get/userdata`, { email: emailInput.trim() }, {
  headers: {
    Authorization: `Bearer ${adminToken}` // 🌟 Pass the token to the backend
  }});
      console.log(res.data.data)
      if (res.data && res.data.data) {
        setUserSims(res.data.data);
      } else {
        setSearchError("No data returned from the server.");
      }
    } catch (err) {
      console.error("Search failed:", err);
      setSearchError(err.response?.data?.message || "Failed to find user. Please check the email.");
    } finally {
      setIsSearching(false);
    }
  };

  // --- API 2: Fetch specific SIM details ---
  const handleCardClick = async (esim_history_id) => {
    setSelectedSim({ loading: true });
    setIsDetailsLoading(true);
    setDetailsError("");

    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/get/user/esimHistorybyId/${esim_history_id}`, {
  headers: {
    Authorization: `Bearer ${adminToken}` // 🌟 Pass the token to the backend
  }});
      console.log(res.data.data)
      
      if (res.data && res.data.data) {
        setSelectedSim(res.data.data);
      } else {
        throw new Error("No details found for this SIM.");
      }
    } catch (err) {
      console.error("Details fetch failed:", err);
      setDetailsError("Failed to load deep eSIM details.");
      setSelectedSim(null); 
    } finally {
      setIsDetailsLoading(false);
    }
  };

  // --- API 3: CSV Export Route ---
  const handleExportCSV = async () => {
    setIsExporting(true);
    
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admin/get/frontend-payload`, 
        { email: emailInput.trim() }, {
  headers: {
    Authorization: `Bearer ${adminToken}` // 🌟 Pass the token to the backend
  }}
      );
      
      const payloadData = res.data?.data;

      if (!payloadData || payloadData.length === 0) {
        alert("No data available to export for this user.");
        return;
      }

      const formattedData = payloadData.map(row => {
        const matchedDest = allDestinations.find(
          (dest) => dest.destinationID === row.destination_country_code
        );
        
        const countryName = matchedDest ? matchedDest.destinationName : (row.destination_country_code || "Unknown");

        return {
          ...row,
          destination_country_code: countryName 
        };
      });

      const headers = Object.keys(formattedData[0]);
      
      const csvRows = formattedData.map(row => {
        return headers.map(fieldName => {
          let cellData = row[fieldName] === null || row[fieldName] === undefined ? '' : row[fieldName];
          cellData = cellData.toString().replace(/"/g, '""');
          if (cellData.search(/("|,|\n)/g) >= 0) {
            cellData = `"${cellData}"`;
          }
          return cellData;
        }).join(',');
      });

      const csvString = [headers.join(','), ...csvRows].join('\n');

      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      const safeEmail = emailInput.split('@')[0]; 
      link.setAttribute("href", url);
      link.setAttribute("download", `Export_${safeEmail}_Payload.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error("Export failed:", err);
      alert(err.response?.data?.message || "Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // --- API 4: Export ALL CSV based on Date Range ---
  const handleExportAllCSV = async () => {
    if (!fromDate || !toDate) {
      alert("Please select both 'From' and 'To' dates.");
      return;
    }

    setIsExportingAll(true);
    
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/get/frontend-payload/all?from_date=${fromDate}&to_date=${toDate}`, {
  headers: {
    Authorization: `Bearer ${adminToken}` // 🌟 Pass the token to the backend
  }}
      );
      
      const payloadData = res.data?.data;

      if (!payloadData || payloadData.length === 0) {
        alert("No data available for the selected date range.");
        return;
      }

      const formattedData = payloadData.map(row => {
        const matchedDest = allDestinations.find(
          (dest) => dest.destinationID === row.destination_country_code
        );
        
        const countryName = matchedDest ? matchedDest.destinationName : (row.destination_country_code || "Unknown");

        return {
          ...row,
          destination_country_code: countryName 
        };
      });

      const headers = Object.keys(formattedData[0]);
      
      const csvRows = formattedData.map(row => {
        return headers.map(fieldName => {
          let cellData = row[fieldName] === null || row[fieldName] === undefined ? '' : row[fieldName];
          cellData = cellData.toString().replace(/"/g, '""');
          if (cellData.search(/("|,|\n)/g) >= 0) {
            cellData = `"${cellData}"`;
          }
          return cellData;
        }).join(',');
      });

      const csvString = [headers.join(','), ...csvRows].join('\n');

      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `Global_Export_${fromDate}_to_${toDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error("Export all failed:", err);
      alert(err.response?.data?.message || "Failed to export data. Please try again.");
    } finally {
      setIsExportingAll(false);
    }
  };

  // --- 🌟 NEW API 5: Send Activation Email ---




const handleSendEmail = async () => {
  if (!selectedSim?.email) {
    alert("No email address associated with this record.");
    return;
  }

  // 1. Generate the QR Code as a base64 image FIRST
  let qrCodeDataUri = "";
  if (selectedSim?.activation_code) {
    try {
      qrCodeDataUri = await QRCode.toDataURL(selectedSim.activation_code, {
        width: 150,
        margin: 1,
      });
    } catch (err) {
      console.error("Failed to generate QR code", err);
    }
  }

  // 2. Create a hidden, temporary container for our HTML template
  const container = document.createElement("div");
  // Safely hide the element behind the UI. Set height to auto so it doesn't get squished.
  container.style.position = "absolute";
  container.style.top = "0px"; 
  container.style.left = "0px"; 
  container.style.zIndex = "-9999"; 
  container.style.width = "650px"; 
  container.style.height = "auto"; 
  container.style.backgroundColor = "#fafafa"; 
  
  // 3. Insert your Premium HTML Email Template here
 container.innerHTML = `
    <div style="margin:0; padding:0; background-color:#fafafa; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <!-- Outer Wrapper -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fafafa" style="table-layout:fixed;">
          <tr>
              <td align="center" style="padding: 40px 20px;">
                  
                  <!-- Main Card -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; margin:0 auto; background-color:#ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #f1f5f9;">

                      <!-- 🌟 Premium Header -->
                    <tr>
                          <td align="center" style="background-color:#077770; padding: 45px 30px 40px 30px;">
                              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                                  <tr>
                                      <td valign="middle" style="padding-right: 0px;padding-top:40px">
                                          <img src="https://res.cloudinary.com/dyalxye1e/image/upload/v1771692673/Logo_eqejec.png" alt="SiM Claire Mascot" width="90" style="display:block; border: 0;">
                                      </td>
                                      
                                      <td valign="middle">
                                          <div style="font-family: 'Avenir', Helvetica, Arial, sans-serif; font-size: 46px; letter-spacing: -0.5px; margin: 0 0 0 -12px; white-space: nowrap; line-height: 1;">
                                              <span style="color:#ffffff; font-weight: bold; font-style: italic;">SiM</span>&nbsp;<span style="color:#f28628; font-weight: 500; font-style: italic;">Claire</span><sup style="font-size: 16px; color: #f28628; padding: 4px 0px; border-radius: 12px; margin-left: 4px; font-weight: bold; font-style: normal; vertical-align: super; letter-spacing: 0;">TM</sup>
                                          </div>
                                      </td>
                                  </tr>
                              </table>
                          </td>
                      </tr>

                      <!-- 🌟 Premium Welcome Message -->
                      <tr>
                          <td style="padding: 40px 40px 20px 40px;">
                              <h1 style="margin:0 0 12px 0; color:#0f172a; font-size:26px; font-weight: 800; letter-spacing: -0.5px;">
                                  Welcome to borderless connectivity, <span style="color:#077770;">${selectedSim?.name || 'Customer'}</span>.
                              </h1>
                              <p style="margin:0; color:#475569; font-size:15px; line-height:1.6; font-weight: 500;">
                                  Thank you for choosing SiM Claire. Your order has been successfully processed and your eSIM is ready. Below is your official receipt and comprehensive plan summary.
                              </p>
                          </td>
                      </tr>

                      <!-- 🌟 Order Summary Box -->
                      <tr>
                          <td style="padding: 0 40px 24px 40px;">
                              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #f1f5f9; background-color: #ffffff; border-radius: 16px;">
                                  <tr>
                                      <td style="padding: 24px;">
                                          <h3 style="margin: 0 0 20px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; color:#94a3b8; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">Order Summary</h3>
                                          
                                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                              <tr>
                                                  <td style="padding: 0 0 12px 0; color:#64748b; font-size:14px; font-weight: 600; width:40%;">Order Number:</td>
                                                  <td align="right" style="padding: 0 0 12px 0; color:#0f172a; font-size:14px; font-weight: 800;">#${selectedSim?.order_id || 'N/A'}</td>
                                              </tr>
                                              <tr>
                                                  <td style="padding: 0 0 12px 0; color:#64748b; font-size:14px; font-weight: 600;">Date of Issue:</td>
                                                  <td align="right" style="padding: 0 0 12px 0; color:#0f172a; font-size:14px; font-weight: 800;">${selectedSim?.purchaseDate || new Date().toLocaleDateString()}</td>
                                              </tr>
                                              <tr>
                                                  <td style="padding: 0 0 12px 0; color:#64748b; font-size:14px; font-weight: 600;">Registered Email:</td>
                                                  <td align="right" style="padding: 0 0 12px 0; color:#077770; font-size:14px; font-weight: 800; text-decoration: none;">${selectedSim?.email || 'N/A'}</td>
                                              </tr>
                                              <tr>
                                                  <td style="padding: 0 0 12px 0; color:#64748b; font-size:14px; font-weight: 600;">Order Status:</td>
                                                  <td align="right" style="padding: 0 0 12px 0;">
                                                      <span style="background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #059669; padding: 4px 10px; border-radius: 9999px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${selectedSim?.order_status || 'COMPLETED'}</span>
                                                  </td>
                                              </tr>
                                              <tr>
                                                  <td style="padding: 0; color:#64748b; font-size:14px; font-weight: 600;">Payment Status:</td>
                                                  <td align="right" style="padding: 0; color:#0f172a; font-size:14px; font-weight: 800;">${selectedSim?.payment_status || 'PAID'}</td>
                                              </tr>
                                          </table>
                                      </td>
                                  </tr>
                              </table>
                          </td>
                      </tr>

                      <!-- 🌟 Technical Specifications -->
                      <tr>
                          <td style="padding: 0 40px 24px 40px;">
                              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #f1f5f9; background-color: #ffffff; border-radius: 16px;">
                                  <tr>
                                      <td style="padding: 24px;">
                                          <h3 style="margin: 0 0 20px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; color:#94a3b8; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">Technical Specifications</h3>
                                          
                                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                              <tr>
                                                  <td style="padding: 0 0 12px 0; color:#64748b; font-size:14px; font-weight: 600; width:40%;">Product:</td>
                                                  <td align="right" style="padding: 0 0 12px 0; color:#0f172a; font-size:14px; font-weight: 800;">${selectedSim?.product_type || 'eSIM Plan'}</td>
                                              </tr>
                                              <tr>
                                                  <td style="padding: 0 0 12px 0; color:#64748b; font-size:14px; font-weight: 600;">Destination:</td>
                                                  <td align="right" style="padding: 0 0 12px 0; color:#0f172a; font-size:14px; font-weight: 800;">${selectedSim?.country_code || 'Global'}</td>
                                              </tr>
                                              <tr>
                                                  <td style="padding: 0 0 12px 0; color:#64748b; font-size:14px; font-weight: 600;">Network Type:</td>
                                                  <td align="right" style="padding: 0 0 12px 0; color:#0f172a; font-size:14px; font-weight: 800;">${selectedSim?.sim_type || 'eSIM'}</td>
                                              </tr>
                                              <tr>
                                                  <td style="padding: 0 0 12px 0; color:#64748b; font-size:14px; font-weight: 600;">Payment Intent:</td>
                                                  <td align="right" style="padding: 0 0 12px 0; color:#64748b; font-size:12px; font-family: monospace; font-weight: 600;">${selectedSim?.stripe_payment_intent_id || 'N/A'}</td>
                                              </tr>
                                              <tr>
                                                  <td style="padding: 0; color:#64748b; font-size:14px; font-weight: 600;">Session ID:</td>
                                                  <td align="right" style="padding: 0; color:#64748b; font-size:12px; font-family: monospace; font-weight: 600;">${selectedSim?.stripe_sessionId || 'N/A'}</td>
                                              </tr>
                                          </table>
                                      </td>
                                  </tr>
                              </table>
                          </td>
                      </tr>

                      <!-- 🌟 Activation Details & QR Code -->
                      <tr>
                          <td style="padding: 0 40px 24px 40px;">
                              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #f1f5f9; background-color: #ffffff; border-radius: 16px;">
                                  <tr>
                                      <td align="center" style="padding: 24px;">
                                          <h3 style="margin: 0 0 20px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; color:#94a3b8; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; text-align: left;">Activation Details</h3>
                                          
                                          ${qrCodeDataUri ? `
                                            <div style="margin-bottom: 24px;">
                                                <img src="${qrCodeDataUri}" alt="QR Code" style="width: 150px; height: 150px; border-radius: 8px; border: 2px solid #e2e8f0;" />
                                                <p style="margin-top: 12px; font-size: 14px; font-weight: 600; color: #475569;">Scan this QR Code to activate your eSIM</p>
                                            </div>
                                          ` : ''}

                                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                              <tr>
                                                  <td style="padding: 0 0 12px 0; color:#64748b; font-size:14px; font-weight: 600; width:40%; text-align: left;">ICCID:</td>
                                                  <td align="right" style="padding: 0 0 12px 0; color:#0f172a; font-size:14px; font-weight: 800; word-break: break-all;">${selectedSim?.iccid || 'N/A'}</td>
                                              </tr>
                                              <tr>
                                                  <td style="padding: 0 0 12px 0; color:#64748b; font-size:14px; font-weight: 600; width:40%; text-align: left;">Activation Code:</td>
                                                  <td align="right" style="padding: 0 0 12px 0; color:#0f172a; font-size:14px; font-weight: 800; word-break: break-all;">${selectedSim?.activation_code || 'N/A'}</td>
                                              </tr>
                                              <tr>
                                                  <td style="padding: 0 0 12px 0; color:#64748b; font-size:14px; font-weight: 600; width:40%; text-align: left;">MSISDN:</td>
                                                  <td align="right" style="padding: 0 0 12px 0; color:#0f172a; font-size:14px; font-weight: 800;">${selectedSim?.msisdn || 'N/A'}</td>
                                              </tr>
                                          </table>
                                      </td>
                                  </tr>
                              </table>
                          </td>
                      </tr>

                      <!-- 🌟 Premium Alerts/Important Information -->
                      <tr>
                          <td style="padding: 0 40px 24px 40px;">
                              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff7ed; border: 1px solid #ffedd5; padding: 24px; border-radius: 16px;">
                                  <tr>
                                      <td>
                                          <div style="color:#ea580c; font-size:11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">Installation Guidelines</div>
                                          <ul style="color:#78350f; font-size:14px; margin:0; padding-left: 20px; line-height:1.6; font-weight: 500;">
                                              <li style="margin-bottom: 8px;">Secure a stable Wi-Fi connection prior to attempting installation.</li>
                                              <li style="margin-bottom: 8px;">Your QR code may take a few minutes to generate and appear in your dashboard.</li>
                                              <li style="margin-bottom: 8px;">Please verify your device is carrier-unlocked and eSIM compatible.</li>
                                              <li>Retain this official receipt for your records.</li>
                                          </ul>
                                      </td>
                                  </tr>
                              </table>
                          </td>
                      </tr>

                      <!-- 🌟 NEW: Contact Email & Phone -->
                      <tr>
                          <td align="center" style="padding: 0 40px 30px 40px;">
                              <p style="margin: 0; color: #64748b; font-size: 14px; font-weight: 600;">
                                  Need help? Reach our support concierge:
                              </p>
                              <p style="margin: 8px 0 0 0; color: #0f172a; font-size: 15px; font-weight: 800;">
                                  <a href="mailto:care@simclaire.com" style="color: #077770; text-decoration: none;">care@simclaire.com</a> 
                                  &nbsp;|&nbsp; 
                                  <a href="tel:+14376056560" style="color: #077770; text-decoration: none;">+1 (437) 605-6560</a>
                              </p>
                          </td>
                      </tr>

                      <!-- 🌟 Footer -->
                      <tr>
                          <td align="center" style="background-color: #f8fafc; padding: 30px; border-top: 1px solid #f1f5f9;">
                              <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 13px; font-weight: 600;">
                                  &copy; 2026 SiM Claire. All rights reserved.
                              </p>
                          </td>
                      </tr>

                  </table>
                  
                  <!-- Extra space at the bottom for spacing -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr><td height="40">&nbsp;</td></tr>
                  </table>

              </td>
          </tr>
      </table>
    </div>
  `;
  
  document.body.appendChild(container);

  try {
    // Wait for DOM to fully paint the base64 QR code and text
    await new Promise((resolve) => setTimeout(resolve, 400));

    const canvas = await html2canvas(container, { 
      scale: 2, 
      useCORS: true,
      logging: false 
    }); 
    
    const imgData = canvas.toDataURL("image/jpeg", 0.92); 
    
    // 🌟 FIX 2: Dynamic PDF Dimensions!
    // We set the width to 650pt (matching our container width) 
    // and let the height dynamically scale to match the canvas perfectly. No more clipping!
    const pdfWidth = 650;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: [pdfWidth, pdfHeight], // Custom aspect ratio instead of 'a4'
      compress: true 
    });

    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
    
    pdf.save(`SiM_Claire_Order_${selectedSim?.order_id || 'Receipt'}.pdf`); 

    alert("The high-quality PDF receipt has been downloaded. Please manually attach it to the email that is about to open.");

    const subject = encodeURIComponent(`SiM Claire Activation Details - Order #${selectedSim?.order_id || 'N/A'}`);
    const bodyText = `Hello,\n\nPlease find your official SiM Claire receipt and eSIM activation details (including your QR code) in the attached PDF.\n\nThank you!`;
    const body = encodeURIComponent(bodyText);
    
    window.location.href = `mailto:${selectedSim?.email || ''}?subject=${subject}&body=${body}`;

  } catch (error) {
    console.error("Error generating HTML-to-PDF:", error);
    alert("Failed to generate the document. Please try again.");
  } finally {
    document.body.removeChild(container);
  }
};

  const closeModal = () => setSelectedSim(null);

  return (
    <div className="min-h-screen bg-[#fafafa] p-6 lg:p-10 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">User History Search</h1>
          <p className="text-slate-500 mt-1">Look up a user by email to view all their purchased eSIMs, pricing breakdowns, and technical details.</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-10">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="text-gray-400" size={20} />
              </div>
              <input
                type="email"
                placeholder="Enter customer email address (e.g. name@domain.com)"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#077770]/20 focus:border-[#077770] transition-all text-gray-900 font-medium"
              />
            </div>
            <button 
              type="submit" 
              disabled={isSearching}
              className="px-8 py-3.5 bg-[#077770] text-white font-bold rounded-xl hover:bg-[#06605a] transition-colors disabled:opacity-70 flex items-center justify-center min-w-[140px] cursor-pointer shadow-sm"
            >
              {isSearching ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : "Search"}
            </button>
          </form>
          {searchError && <p className="text-red-500 text-sm font-semibold mt-3">{searchError}</p>}
        </div>

        {/* Global Export Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-10">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-800">Global Data Export</h2>
            <p className="text-sm text-gray-500">Download a complete CSV payload report for all users within a specific date range.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input 
                type="date" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-[#077770] w-full"
              />
              <span className="text-gray-400 text-sm font-bold">to</span>
              <input 
                type="date" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-[#077770] w-full"
              />
            </div>

            <button 
              onClick={handleExportAllCSV}
              disabled={isExportingAll || !fromDate || !toDate}
              className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center min-w-[160px] cursor-pointer shadow-sm w-full sm:w-auto"
            >
              {isExportingAll ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <><Download size={18} className="mr-2" /> Export All CSV</>
              )}
            </button>
          </div>
        </div>

        {/* Results List (API 1 Data) */}
        {hasSearched && !isSearching && !searchError && (
          <div className="space-y-6">
            
            {/* Result Header with Export Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-4">
              <h2 className="text-xl font-bold text-gray-800">
                Found {userSims.length} Orders for <span className="text-[#077770]">{emailInput}</span>
              </h2>
              
              {userSims.length > 0 && (
                <button 
                  onClick={handleExportCSV}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer border border-slate-300"
                >
                  {isExporting ? (
                    <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Download size={16} />
                  )}
                  {isExporting ? "Generating..." : "Export as CSV"}
                </button>
              )}
            </div>

            {userSims.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl border border-gray-200 text-center shadow-sm">
                <p className="text-gray-500 font-medium">This user hasn't purchased any eSIMs yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {userSims.map((sim) => (
                  <div 
                    key={sim.esim_history_id} 
                    onClick={() => handleCardClick(sim.esim_history_id)}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#077770]/40 transition-all cursor-pointer group flex flex-col overflow-hidden"
                  >
                    {/* Top Bar: Core Identifiers */}
                    <div className="bg-gray-50/50 border-b border-gray-100 p-4 sm:px-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#077770]/10 flex items-center justify-center text-[#077770] shrink-0">
                          <Globe size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-lg flex items-center gap-2">
                            {sim.country_code} <span className="text-xs font-semibold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Type {sim.sim_type}</span>
                          </p>
                          <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5 mt-0.5">
                            <Calendar size={14}/> {formatDate(sim.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <StatusBadge status={sim.order_status} label="Order" />
                        <StatusBadge status={sim.payment_status} label="Payment" />
                        <StatusBadge status={sim.provisioning_status} label="Provision" />
                      </div>
                    </div>

                    {/* Middle Section: Technical & Financials Split */}
                    <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                      
                      {/* Left: Technical Identifiers */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Database size={14}/> Technical Details
                          </h4>
                          <span className={`text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full ${sim.terms_agreed === 1 ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                            Terms agreed: {sim.terms_agreed === 1 ? "Yes" : "No"}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Order ID</p>
                            <p className="font-semibold text-gray-900">#{sim.order_id}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Payment ID</p>
                            <p className="font-semibold text-gray-900">#{sim.payment_id}</p>
                          </div>
                          <div className="sm:col-span-2">
                            <p className="text-xs text-gray-500 mb-1">ICCID</p>
                            <p className="font-mono text-sm font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded inline-block break-all border border-gray-200">
                              {sim.iccid ? sim.iccid : "Pending Initialization..."}
                            </p>
                          </div>
                          {sim.msisdn && (
                            <div className="sm:col-span-2">
                              <p className="text-xs text-gray-500 mb-1">MSISDN (Phone Number)</p>
                              <p className="font-mono text-sm font-semibold text-gray-900">{sim.msisdn}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Financial Breakdown */}
                      <div className="space-y-4 lg:border-l border-gray-100 lg:pl-10">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                          <DollarSign size={14}/> Financial Breakdown
                        </h4>

                        <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                          {/* 1. API Base Price */}
                          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                            <span className="text-sm text-gray-600 font-medium flex items-center gap-1.5">
                              <Database size={14} className="text-gray-400"/> API Cost (Base)
                            </span>
                            <span className="font-mono font-semibold text-gray-700">
                              {sim.currency} {sim.base_price}
                            </span>
                          </div>

                          {/* 2. Billed/Final Price */}
                          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                            <div className="flex flex-col">
                              <span className="text-sm text-gray-800 font-bold flex items-center gap-1.5">
                                <Tag size={14} className="text-[#077770]"/> Billed to User
                              </span>
                              {(sim.discount_value > 0 || sim.promo_code) && (
                                <span className="text-[10px] text-[#077770] font-medium mt-0.5">
                                  Discount: -{sim.currency} {sim.discount_value} {sim.promo_code && `(${sim.promo_code})`}
                                </span>
                              )}
                            </div>
                            <span className="font-mono font-bold text-lg text-[#077770]">
                              {sim.currency} {sim.final_price}
                            </span>
                          </div>

                          {/* 3. Actual Paid Amount */}
                          <div className="flex justify-between items-center pt-1">
                            <span className="text-sm text-gray-600 font-medium flex items-center gap-1.5">
                              <CreditCard size={14} className="text-green-600"/> Actual Amount Paid
                            </span>
                            <span className="font-mono font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded border border-green-200">
                              {sim.payment_currency} {sim.payment_amount}
                            </span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Detailed Modal (API 2 Data) */}
        {selectedSim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
              
              {/* 🌟 UPDATED Modal Header with Send Email Button */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border-b border-gray-100 bg-gray-50/80 gap-4">
                <div>
                  <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">Deep eSIM Record</h3>
                  <p className="text-sm text-gray-500 mt-1 font-medium flex items-center gap-2">
                    History ID: <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded text-gray-700">#{selectedSim.esim_history_id || "Loading..."}</span> | User ID: <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded text-gray-700">#{selectedSim.user_id}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {selectedSim.email && !selectedSim.loading && (
                    <button 
                      onClick={handleSendEmail}
                      disabled={isSendingEmail || !selectedSim.activation_code}
                      className="flex items-center gap-2 px-4 py-2 bg-[#077770] text-white font-bold text-sm rounded-xl hover:bg-[#06605a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                    >
                      {isSendingEmail ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Mail size={16} />
                      )}
                      {isSendingEmail ? "Sending..." : "Resend eSIM Email"}
                    </button>
                  )}
                  <button onClick={closeModal} className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-white border border-transparent hover:border-gray-200 shadow-sm rounded-full transition-all cursor-pointer">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto">
                {isDetailsLoading || selectedSim.loading ? (
                  <div className="py-20 flex flex-col items-center justify-center text-[#077770]">
                    <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="font-bold">Fetching deep telecom & stripe records...</p>
                  </div>
                ) : detailsError ? (
                  <div className="py-10 text-center text-red-500 font-bold bg-red-50 rounded-xl border border-red-100">{detailsError}</div>
                ) : (
                  <div className="space-y-8">
                    
                    {/* Section 1: Network & Activation */}
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-extrabold text-[#077770] uppercase tracking-widest mb-4 border-b pb-2">
                        <QrCode size={16} /> Network Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <p className="text-[10px] uppercase font-extrabold text-gray-400 mb-1">ICCID</p>
                          <p className="font-mono font-bold text-gray-900 break-all">{selectedSim.iccid ? selectedSim.iccid : "N/A"}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <p className="text-[10px] uppercase font-extrabold text-gray-400 mb-1">Activation Code (LPA)</p>
                          <p className="font-mono text-sm font-bold text-gray-900 break-all">{selectedSim.activation_code || "N/A"}</p>
                        </div>
                        
                        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <div>
                            <p className="text-[10px] uppercase font-extrabold text-gray-400">SKU</p>
                            <p className="font-bold text-gray-900">{selectedSim.sku}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-extrabold text-gray-400">Product Type</p>
                            <p className="font-bold text-gray-900">{selectedSim.product_type}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-extrabold text-gray-400">Quantity</p>
                            <p className="font-bold text-gray-900">{selectedSim.quantity}</p>
                          </div>
                        </div>

                        <div className="md:col-span-2 bg-[#077770]/5 p-5 rounded-xl border border-[#077770]/10">
                           <p className="text-[10px] font-extrabold text-[#077770] uppercase tracking-widest mb-4 flex items-center gap-1.5"><Activity size={14}/> Provider Logs</p>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                             <div>
                                <p className="text-[10px] uppercase font-extrabold text-gray-400 mb-0.5">Provider Purchase ID</p>
                                <p className="font-mono text-sm font-bold text-gray-800 break-all bg-white p-2 rounded-lg border border-[#077770]/10">{selectedSim.provider_purchase_id || "N/A"}</p>
                             </div>
                             <div>
                                <p className="text-[10px] uppercase font-extrabold text-gray-400 mb-0.5">Provider Ref</p>
                                <p className="font-mono text-sm font-bold text-gray-800 break-all bg-white p-2 rounded-lg border border-[#077770]/10">{selectedSim.provider_reference || "N/A"}</p>
                             </div>
                             <div>
                                <p className="text-[10px] uppercase font-extrabold text-gray-400 mb-0.5">Status Code/Msg</p>
                                <p className="font-mono text-sm font-bold text-gray-800">
                                  <span className="bg-white px-2 py-1 rounded border border-[#077770]/10">{selectedSim.provider_status_code || "N/A"}</span> 
                                  <span className="ml-2 text-gray-500">{selectedSim.provider_status_msg && `(${selectedSim.provider_status_msg})`}</span>
                                </p>
                             </div>
                             <div>
                                <p className="text-[10px] uppercase font-extrabold text-gray-400 mb-0.5">TXN Time</p>
                                <p className="font-mono text-sm font-bold text-gray-800 bg-white p-2 rounded-lg border border-[#077770]/10 inline-block">{selectedSim.provider_txn_time || "N/A"}</p>
                             </div>
                           </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Stripe & Financials */}
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-extrabold text-purple-600 uppercase tracking-widest mb-4 border-b pb-2">
                        <CreditCard size={16} /> Status & Gateway Records
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        <div className="flex flex-col gap-4 bg-gray-50 p-5 rounded-xl border border-gray-100">
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] uppercase font-extrabold text-gray-500">Order Status</span>
                            <StatusBadge status={selectedSim.order_status} />
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] uppercase font-extrabold text-gray-500">Payment Status</span>
                            <StatusBadge status={selectedSim.payment_status} />
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] uppercase font-extrabold text-gray-500">Provisioning Status</span>
                            <StatusBadge status={selectedSim.provisioning_status} />
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t border-gray-200 mt-1">
                            <span className="text-sm font-extrabold text-gray-900">Total Charged</span>
                            <span className="font-extrabold text-xl text-green-600 bg-green-100 px-3 py-1 rounded-lg border border-green-200">{userSims.find(s => s.esim_history_id === selectedSim.esim_history_id)?.payment_currency} {selectedSim.payment_amount}</span>
                          </div>
                        </div>

                        <div className="flex flex-col justify-center gap-5 bg-gray-50 p-5 rounded-xl border border-gray-100">
                          <div>
                            <span className="text-[10px] uppercase font-extrabold text-gray-400 block mb-1">Stripe Payment Intent ID</span>
                            <span className="font-mono text-sm font-bold text-gray-800 bg-white border border-gray-200 px-3 py-2 rounded-lg block truncate">{selectedSim.stripe_payment_intent_id || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-extrabold text-gray-400 block mb-1">Stripe Session ID</span>
                            <span className="font-mono text-sm font-bold text-gray-800 bg-white border border-gray-200 px-3 py-2 rounded-lg block truncate">{selectedSim.stripe_sessionId || "N/A"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: User Details & eKYC (Shows if data exists) */}
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-extrabold text-slate-800 uppercase tracking-widest mb-4 border-b pb-2">
                        <User size={16} /> Customer Information
                      </h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-3 sm:col-span-2">
                           <div className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center"><User size={18} className="text-slate-400"/></div>
                           <div>
                             <p className="text-[10px] uppercase font-extrabold text-gray-400">Email Address</p>
                             <p className="font-bold text-gray-900">{selectedSim.email || "N/A"}</p>
                           </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center"><FileCheck size={18} className="text-slate-400"/></div>
                           <div>
                             <p className="text-[10px] uppercase font-extrabold text-gray-400">Terms Agreed?</p>
                             <p className={`font-extrabold ${userSims.find(s => s.esim_history_id === selectedSim.esim_history_id)?.terms_agreed === 1 ? "text-green-600" : "text-gray-400"}`}>
                               {userSims.find(s => s.esim_history_id === selectedSim.esim_history_id)?.terms_agreed === 1 ? "Yes" : "No"}
                             </p>
                           </div>
                        </div>
                      </div>

                      {(selectedSim.customer_name || selectedSim.customer_document_number) && (
                        <div className="bg-orange-50/50 rounded-xl p-5 border border-orange-100 grid grid-cols-2 sm:grid-cols-4 gap-5 mt-4 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <ShieldAlert size={100} />
                          </div>
                          
                          <div className="col-span-2 sm:col-span-4 mb-1">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold bg-orange-100 text-orange-700 uppercase tracking-wider border border-orange-200">
                              <ShieldAlert size={14}/> eKYC Verification Data
                            </span>
                          </div>
                          <div className="relative z-10">
                            <p className="text-[10px] uppercase font-extrabold text-orange-500/70 mb-1">Full Name</p>
                            <p className="font-bold text-gray-900">{selectedSim.customer_name} {selectedSim.customer_surname1}</p>
                          </div>
                          <div className="relative z-10">
                            <p className="text-[10px] uppercase font-extrabold text-orange-500/70 mb-1">Document Number</p>
                            <p className="font-mono font-bold text-gray-900 bg-white px-2 py-1 rounded inline-block shadow-sm">{selectedSim.customer_document_number}</p>
                          </div>
                          <div className="relative z-10">
                            <p className="text-[10px] uppercase font-extrabold text-orange-500/70 mb-1">Birthdate</p>
                            <p className="font-bold text-gray-900">{selectedSim.customer_birthdate}</p>
                          </div>
                          <div className="relative z-10">
                            <p className="text-[10px] uppercase font-extrabold text-orange-500/70 mb-1">Gender / Nat. ID</p>
                            <p className="font-bold text-gray-900">{selectedSim.customer_sex} / {selectedSim.customer_nationality_id}</p>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}