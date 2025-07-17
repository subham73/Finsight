import React, { useDebugValue, useEffect, useState } from "react";
import { data, useNavigate } from "react-router-dom";
import { getToken, isTokenExpired, getAuthHeaders } from "../core/auth";
import Header from "../components/Header";
import Footer from "../components/Footer";
import FreezeModal from "../components/FreezeModal";
import FilterControls from "../components/FilterControls"; 
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "./styles/Forecast.css";

const Forecast = () => {
  const userRole = localStorage.getItem("userRole");
  const navigate = useNavigate();
  const [freezeStart, setFreezeStart] = useState(5);
  const [freezeEnd, setFreezeEnd] = useState(15);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage,setItemsPerPage] = useState(5);
  const totalPages = Math.ceil(projects.length / itemsPerPage);
  const [mode, setMode] = useState("read");
  const [editedData, setEditedData] = useState({});
  

  const today = new Date().getDate();
  const isWithinFreezeWindow = today >= freezeStart && today <= freezeEnd;

  useEffect(() => {
    const savedStart = localStorage.getItem("freezeStart");
    const savedEnd = localStorage.getItem("freezeEnd");
  
    if (savedStart && savedEnd) {
      setFreezeStart(Number(savedStart));
      setFreezeEnd(Number(savedEnd));
    }
  }, []);  

  const handleFreezeSave = () => {
    localStorage.setItem("freezeStart", freezeStart);
    localStorage.setItem("freezeEnd", freezeEnd);
    setShowFreezeModal(false);
  };  
  
  // Updated filters state to match FilterControls expectations
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    region: "all",
    status: "all",
    currency: "all",
    cluster: "all",
    manager: "all",
    vertical: "all",
    customer_group: "all",
    customer_name: "all",
    forecast_type: "all",
    report_type: "all",
  });

  useEffect(() => {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      navigate("/login");
      return;
    }

    fetchProjects();
  }, [filters]);

  const buildQueryString = (filters) => {
    return Object.entries(filters)
      .filter(([_, value]) => value !== "all" && value !== null && value !== "")
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join("&");
  };

  
function formatNumberWithCommas(value) {
  return  (new Intl.NumberFormat('en-US')).format(value)
  }
  
  const fetchProjects = async () => {
    try {
      const queryString = buildQueryString(filters);
      const url = `http://172.28.77.151:8081/projects/?${queryString}`;
  
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      });
  
      if (!response.ok) throw new Error("Failed to fetch forecast data");
  
      const data = await response.json();
      setProjects(data);
      setCurrentPage(1);
      console.log("projects are",data);
    } catch (err) {
      console.error(err.message);
      navigate("/login");
    }
  };

     // Handle filter changes from FilterControls component
     const handleFilterChange = (filterType, value) => {
      setFilters(prev => ({
        ...prev,
        [filterType]: value
      }));
    };

  const currentData = projects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleSelect = (projectId) => {
    if (selectedProjectId) {
      return setSelectedProjectId(null);
    }
    setSelectedProjectId(projectId);
  };

  const handleAddProject = () => {
    navigate("/add-project");
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("access_token");
  
      for (const projectId in editedData) {
        const projectData = editedData[projectId];
        const forecasts_po = projectData.forecasts_po || {};
        const forecast_type = projectData.forecast_type;
  
        const forecasts = Object.entries(forecasts_po).map(([month, amount]) => ({
          forecast_type,
          year: filters.year,
          month: parseInt(month),
          amount: parseFloat(amount),
        }));
  
        const response = await fetch(`http://172.28.77.151:8081/projects/${projectId}/forecasts/update-edited`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          
          body: JSON.stringify({
               forecasts,
               }),  
        });
  
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Server error response:", errorText);
          throw new Error(`Failed to save project ${projectId}`);
        }
      }
  
      alert("Forecasts saved successfully!");
      setEditedData({});
      setMode("read");
      setFilters((prev) => ({ ...prev, report_type: "all" }));
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save forecasts: " + error.message);
    }
  };  

  const handleEditProject = () => {
    if (selectedProjectId) {
      navigate(`/project/${selectedProjectId}/edit`);
    } else {
      alert("Please select a project to edit.");
    }
  };

  const handleDelete = async () => {
    if (!selectedProjectId) {
      alert("Please select a project to delete.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this project?")) return;

    try {
      const res = await fetch(`http://172.28.77.151:8081/projects/${selectedProjectId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(`Failed to delete project: ${errorData.detail || res.statusText}`);
        return;
      }

      alert("Project deleted successfully");
      setSelectedProjectId(null);
      // Re-apply filters to the updated projects list
      fetchProjects();
    } catch (error) {
      alert("Error deleting project: " + error.message);
    }
  };

  const handleExcelExport = () => {
    const headers = [
      "Project Number", "OP Id", "Project Name", "Manager", "Customer Group",
      "Forecast Type", "Customer", "Cluster Head", "Vertical", "Project Type",
      "Source Country", "Execution Country", "Region", "Currency"
    ];
  
    const fiscalYear = (filters.year + 1).toString().slice(-2);
  
    // Month Headers
    const monthHeaders = monthNames.map((name, i) => {
      const monthIndex = monthIndices[i];
      const yearSuffix = monthIndex >= 4 ? filters.year.toString().slice(-2) : fiscalYear;
      const monthHeaderSet = [];
  
      if (filters.report_type === "all" || filters.report_type === "forecast_usd") {
        monthHeaderSet.push(`${name}-${yearSuffix} F(USD)`);
      }
      if (filters.report_type === "all" || filters.report_type === "forecast_po") {
        monthHeaderSet.push(`${name}-${yearSuffix} F`);
      }
      if (filters.report_type === "all" || filters.report_type === "actual") {
        monthHeaderSet.push(`${name}-${yearSuffix} A(USD)`);
      }
  
      return monthHeaderSet;
    }).flat();
  
    // Quarter Headers
    const quarterHeaders = [1, 2, 3, 4].flatMap((q, idx) => {
      const quarterHeaderSet = [];
      if (filters.report_type === "all" || filters.report_type === "forecast_usd") {
        quarterHeaderSet.push(`FY'${fiscalYear}-Q${q} F(USD)`);
      }
      if (filters.report_type === "all" || filters.report_type === "forecast_po") {
        quarterHeaderSet.push(`FY'${fiscalYear}-Q${q} F`);
      }
      if (filters.report_type === "all" || filters.report_type === "actual") {
        quarterHeaderSet.push(`FY'${fiscalYear}-Q${q} A(USD)`);
      }
      return quarterHeaderSet;
    });
  
    const finalHeaders = [
      ...headers,
      ...monthHeaders,
      ...quarterHeaders,
      "Total Forecast (regional)",
      "Total Forecast (USD)",
      "Total Actuals (USD)",
      "Status",
      "Remarks"
    ];
  
    const data = projects.map((proj) => {
      const f_usd = proj.forecasts_usd || {};
      const f_po = proj.forecasts_po || {};
      const a = proj.actuals || {};
  
      const row = [
        proj.project_number,
        proj.op_ids,
        proj.project_name,
        proj.manager_name,
        proj.customer_group,
        proj.forecast_type,
        proj.customer_name,
        proj.cluster_head_name,
        proj.vertical,
        proj.project_type,
        proj.source_country,
        proj.execution_country,
        proj.region,
        proj.currency
      ];
  
      // Monthly values
      monthIndices.forEach((m) => {
        if (filters.report_type === "all" || filters.report_type === "forecast_usd") {
          row.push(formatNumberWithCommas((f_usd[m] ?? 0).toFixed(0)));
        }
        if (filters.report_type === "all" || filters.report_type === "forecast_po") {
          row.push(formatNumberWithCommas((f_po[m] ?? 0).toFixed(0)));
        }
        if (filters.report_type === "all" || filters.report_type === "actual") {
          row.push(formatNumberWithCommas((a[m] ?? 0).toFixed(0)));
        }
      });
  
      // Quarterly values
      [0, 3, 6, 9].forEach((i) => {
        if (filters.report_type === "all" || filters.report_type === "forecast_usd") {
          row.push(formatNumberWithCommas(getQuarterSum(f_usd, i)));
        }
        if (filters.report_type === "all" || filters.report_type === "forecast_po") {
          row.push(formatNumberWithCommas(getQuarterSum(f_po, i)));
        }
        if (filters.report_type === "all" || filters.report_type === "actual") {
          row.push(formatNumberWithCommas(getQuarterSum(a, i)));
        }
      });
  
      // Totals and other info
      row.push(
        formatNumberWithCommas((proj.total_forecast_regional ?? 0).toFixed(0)),
        formatNumberWithCommas((proj.total_forecast_usd ?? 0).toFixed(0)),
        formatNumberWithCommas((proj.total_actual_usd ?? 0).toFixed(0)),
        proj.status,
        proj.remarks
      );
  
      return row;
    });
  
    // Create sheet and trigger download
    const worksheet = XLSX.utils.aoa_to_sheet([finalHeaders, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Forecasts");
  
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `PLM_Forecast_FY-${fiscalYear}.xlsx`);
  };
  

  const monthNames = ["Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const monthIndices = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

  const getQuarterSum = (f, startIdx) => {
    return [0, 1, 2].reduce((sum, offset) => sum + (f[monthIndices[startIdx + offset]] || 0), 0)?.toFixed(0);
  };

  const isEditableUntil = (monthIndex, selectedFinancialYear) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // Determine the forecast year for the given month index
    const forecastYear = monthIndex <= 3 ? selectedFinancialYear + 1 : selectedFinancialYear;
    
    // Editable if forecast is for the current month or future months in the current or next financial year
    return forecastYear > currentYear || (forecastYear === currentYear && monthIndex >= currentMonth);
    };
    

  return (
    <>
      <Header />
      <div className="forecast-container">
        <div className="forecast-header">
          <div className="forecast-title">
            <h4>PLM Project Forecast</h4>
          <div className="forecast-actions">
          <div className="filter-group">
                <select
                  value={filters.report_type || "all"}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      report_type: e.target.value,
                    }))
                  }
                  disabled={mode === "edit"}
                >
                  <option value="all">Show Forecast & Actuals(USD)</option>
                  <option value="forecast_usd">Show Forecast(USD)</option>
                  <option value="actual">Show Actuals(USD)</option>
                  <option value="forecast_po">Show Forecast in PO currency</option>
                </select>
              </div>
              {/* {userRole === "SH" && ( */}
                <button className="btn-primary" onClick={handleExcelExport}>
                  Export Excel 🚀
                </button>
            {/* )} */}
              
            <button className="btn-primary" onClick={handleAddProject} disabled={!isWithinFreezeWindow && userRole!== "SH"}>+ Add Forecast</button>
            <button 
              className="btn-secondary"
              onClick={handleEditProject} 
              disabled={!selectedProjectId || (!isWithinFreezeWindow && userRole!== "SH")} 
              hidden={!selectedProjectId}
            >
              Edit Forecast
            </button>
            <button 
              className="btn-secondary"
              onClick={handleDelete} 
              disabled={!selectedProjectId || (!isWithinFreezeWindow && userRole!== "SH")} 
              hidden={!selectedProjectId} >
              Delete
            </button>
            {userRole === "SH" && (
                <button className="btn-secondary" onClick={() => setShowFreezeModal(true)}>
                  🔒 Freeze
                </button>
            )}

          </div>
          </div>
          
          {showBanner && (
            <div className={`flash-banner ${isWithinFreezeWindow ? "active" : "frozen"}`}>
              <div className="scroll-container">
                <div className="scroll-text">
                  {isWithinFreezeWindow
                    ? `📢 Forecast can be added and edited from ${freezeStart}-${new Date().getMonth()}-${new Date().getFullYear()} to ${freezeEnd}-${new Date().getMonth()}-${new Date().getFullYear()} of this month.`
                    : "⚠️ Forecast actions are currently frozen."}
                </div>
              </div>
              <button className="close-banner" onClick={() => setShowBanner(false)}>✖</button>
            </div>
          )}

        <FilterControls
          filters={filters}
          onFilterChange={handleFilterChange}
          showProjectSpecific={true}
          className="forecast-filters"
        />
        </div>
        
        {showFreezeModal && (
          <FreezeModal
            freezeStart={freezeStart}
            freezeEnd={freezeEnd}
            setFreezeStart={setFreezeStart}
            setFreezeEnd={setFreezeEnd}
            onClose={handleFreezeSave}
          />
        )}

        <div className="forecast-conatiner">
        <div className="forecast-toolbar">
        <div className="row-selector">
          <label htmlFor="itemsPerPage">No of Rows:</label>
          <select
            id="itemsPerPage"
            name="itemsPerPage"
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
          >
            {[5, 8, 10, 12, 15, 18, 20].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </div>

            <div className="mode-controls">
              <button
                onClick={() => {
                  setMode("read");
                  setFilters((prev) => ({
                    ...prev,
                    report_type: "all",
                  }));
                }}
                className={mode === "read" ? "active" : ""}
              >
                Read
              </button>

              <button
                onClick={() => {
                  setMode("edit");
                  setFilters((prev) => ({
                    ...prev,
                    report_type: "forecast_po",
                  }));
                }}
                className={mode === "edit" ? "active" : ""}
              >
                Edit
              </button>

              {mode === "edit" && (
                <button className="btn-primary" onClick={handleSave}>
                  Save
                </button>
              )}
            </div>
          </div>
        <div className="forecast-table-container">
          <table className="forecast-table">
            <thead>
              <tr>
                <th></th>
                <th>Project ID</th>
                <th>OP ID</th>
                <th>Project Name</th>
                <th>Manager</th>
                <th>Customer Group</th>
                <th>Currency</th>
                <th>Forecast Type</th>
                <th>Customer</th>
                <th>Cluster Head</th>
                <th>Vertical</th>
                <th>Project Type</th>
                <th>Source Country</th>
                <th>Execution Country</th>
                <th>Region</th>
                {monthNames.map((name, index) => {
                  const ths = [];   
                  const displayYear =
                    index < 9 // April (index 0) to December (index 8)
                    ? filters.year
                    : filters.year + 1;

                    const yearSuffix = displayYear.toString().slice(-2);
                    if (
                      filters.report_type === "all" ||
                      filters.report_type === "forecast_usd"
                    ) {
                      ths.push(<th className="currency" key={name + " F"}>{name}-{yearSuffix} F(USD)</th>);
                    }

                    if (
                      filters.report_type === "forecast_po"
                    ) {
                      ths.push(<th className="currency" key={name + " F"}>{name}-{yearSuffix} F</th>);
                    }

                    if (
                      filters.report_type === "all" ||
                      filters.report_type === "actual"
                    ) {
                      ths.push(<th className="currency" key={name + " A"}>{name}-{yearSuffix} A(USD)</th>);
                    }
                    return <React.Fragment key={name}>{ths}</React.Fragment>;
                  })}
                  {[1, 2, 3, 4].map((q) => {
                    const ths = [];
                    if (
                      filters.report_type === "all" ||
                      filters.report_type === "forecast_usd"
                    ) {
                      ths.push(<th className="currency" key={`Q${q}F`}>FY'{(filters.year+1).toString().slice(-2)}-{`Q${q} F(USD)`}</th>);
                    }

                    if (
                      filters.report_type === "forecast_po"
                    ) {
                      ths.push(<th className="currency" key={`Q${q}F`}>FY'{(filters.year+1).toString().slice(-2)}-{`Q${q} F`}</th>);
                    }

                    if (
                      filters.report_type === "all" ||
                      filters.report_type === "actual"
                    ) {
                      ths.push(<th className="currency" key={`Q${q}A`}>FY'{(filters.year+1).toString().slice(-2)}-{`Q${q} A`}</th>)
                    }
                    
                    return <React.Fragment key={q}>{ths}</React.Fragment>;
                  })}
                <th className="currency">Total Forecast (regional)</th>
                <th className="currency">Total Forecast (USD)</th>
                <th className="currency">Total Actuals (USD)</th>
                <th>Status</th>
                <th className="remarks">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((proj) => {
                const f_usd = proj.forecasts_usd || {};
                const f_po = proj.forecasts_po || {};
                return (
                  <tr key={proj.id}>
                    <td>
                    <input
                          type="radio"
                          name="selectedProject"
                          checked={selectedProjectId === proj.id}
                          onClick={() => handleSelect(proj.id)}
                          readOnly
                        />
                    </td>
                    <td>{proj.project_number}</td>
                    <td>{proj.op_ids}</td>
                    <td>{proj.project_name}</td>
                    <td>{proj.manager_name}</td>
                    <td>{proj.customer_group}</td>
                    <td>{proj.currency}</td>
                    <td>{proj.forecast_type}</td>
                    <td>{proj.customer_name}</td>
                    <td>{proj.cluster_head_name}</td>
                    <td>{proj.vertical}</td>
                    <td>{proj.project_type}</td>
                    <td>{proj.source_country}</td>
                    <td>{proj.execution_country}</td>
                    <td>{proj.region}</td>
                    {monthIndices.map((m) => {
                        const ths = [];
                        if (
                          filters.report_type === "all" ||
                          filters.report_type === "forecast_usd"
                        ) {
                          ths.push(<td className="forecast-cell currency" key={m + " F"}>{formatNumberWithCommas(f_usd[m]?.toFixed(0)) || 0}</td>)
                        }

                        if (
                          filters.report_type === "forecast_po"
                        ) {
                          ths.push(<td className="forecast-cell currency" key={m + " F"}>
                            {mode === "edit" ? (
                              <input
                                type="number"
                                value={editedData[proj.id]?.forecasts_po?.[m] ?? f_po[m] ?? 0}
                                disabled={!isEditableUntil(m, filters.year)}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  setEditedData((prev) => ({
                                    ...prev,
                                    [proj.id]: {
                                      ...prev[proj.id],
                                      forecasts_po: {
                                        ...prev[proj.id]?.forecasts_po,
                                        [m]: value,
                                      },
                                      forecast_type: proj.forecast_type,
                                      source_country: proj.source_country,
                                    },
                                  }));                                  
                                }}
                              />
                            ) : (
                              formatNumberWithCommas(f_po[m]?.toFixed(0)) || 0
                            )}
                          </td>
                          )
                        }

                        if (
                          filters.report_type === "all" ||
                          filters.report_type === "actual"
                        ) {
                          ths.push(
                            <td className="actual-cell currency" key={m + " A"}>{formatNumberWithCommas(proj.actuals[m]?.toFixed(0)) || 0}</td>
                          );
                        }
                        return <React.Fragment key={m}>{ths}</React.Fragment>;
                      })}
                      {[0, 3, 6, 9].map((i) => {
                        const ths = [];
                        if (
                          filters.report_type === "all" ||
                          filters.report_type === "forecast_usd"
                        ) {
                          ths.push(
                            <td className="forecast-cell currency" key={`q${i}F`}>{formatNumberWithCommas(getQuarterSum(f_usd, i))}</td>
                          )
                        }

                        if (
                          filters.report_type === "forecast_po"
                        ) {
                          ths.push(
                            <td className="forecast-cell currency" key={`q${i}F`}>{formatNumberWithCommas(getQuarterSum(f_po, i))}</td>
                          )
                        }

                        if (
                          filters.report_type === "all" ||
                          filters.report_type === "actual"
                        ) { 
                          ths.push(
                            <td className="actual-cell currency" key={`q${i}A`}>{formatNumberWithCommas(getQuarterSum(proj.actuals, i))}</td>
                          );
                        }
                        return <React.Fragment key={i}>{ths}</React.Fragment>;
                      }
                      )}
                    <td className="forecast-cell currency">{formatNumberWithCommas(proj.total_forecast_regional?.toFixed(0))}</td>
                    <td className="forecast-cell currency">{formatNumberWithCommas(proj.total_forecast_usd?.toFixed(0)) || "0"}</td>
                    <td className="actual-cell currency">{formatNumberWithCommas(proj.total_actual_usd?.toFixed(0)) || "0"}</td>
                    <td>{proj.status}</td>
                    <td className="remarks">{proj.remarks}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          
      <div className="forecast-pagination">
        {[...Array(totalPages)].map((_, i) => (
          <button
            key={i}
            className={currentPage === i + 1 ? "active" : ""}
            onClick={() => handlePageChange(i + 1)}
          >
            {i + 1}
          </button>
        ))}
      </div>
        </div>
        </div>
      <Footer />
    </>
  );
};

export default Forecast;