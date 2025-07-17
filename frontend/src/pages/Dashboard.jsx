import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, isTokenExpired } from "../core/auth";
import { Bar, Pie, Doughnut, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
} from "chart.js";

import ChartDataLabels from 'chartjs-plugin-datalabels';

import Header from "../components/Header";
import Footer from "../components/Footer";
import FilterControls from "../components/FilterControls";
import ActualsImportModal from "../components/ActualsImportModal";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles/Dashboard.css";
import ExchangeRatesModal from "../components/ExchangeRatesModal";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  LineElement,
  PointElement
);

const Dashboard = () => {
  
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({
    region: "all",
    status: "all",
    cluster: "all",
    manager: "all",
    vertical: "all",
    forecat_type: "all",
    currency: "all",
    display_currency: "USD", // Changed default to USD for consistency
    year: new Date().getFullYear(),
    quarter: "all",
    customer_group: "all",
    customer_name: "all", // Customer name added
  });
  const [loading, setLoading] = useState(true);
  const [FilterOptions,setFilterOptions] = useState(null);
  const [exchangeRates, setExchangeRates] = useState({});
  const [conversionInfo, setConversionInfo] = useState(null);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [showActualModal, setShowActualModal] = useState(false);
  const [currentQuarterData, setCurrentQuarterData] = useState(null);
  
  // Individual expand states for each chart
  const [expandedCharts, setExpandedCharts] = useState({
    yearlyForecast: false,
    monthlyForecast: false,
    monthlyForecastVariance: false,
    cumulativeForecast: false,
    regionalDistribution: false,
    statusDistribution: false,
    verticalAnalysis: false,
    currencyBreakdown: false,
    forecastRegion: false,
    forecastVertical: false,
    quarterlyForecast: false
  });
  
  const navigate = useNavigate();

  const monthNames = [
    "April", "May", "June", "July", "August", "September",
    "October", "November", "December", "January", "February", "March"
  ];

  // Enhanced currency symbols mapping
  const getCurrencySymbol = (currencyCode) => {
    const symbols = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'INR': '₹',
      'CNY': '¥',
      'AUD': 'A$',
      'CAD': 'C$',
    };
    return symbols[currencyCode] || currencyCode;
  };
  
  const getCurrentQuarter = () => {
    const now = new Date();
    const month = now.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
    
    // Financial year quarters (Apr-Mar)
    if (month >= 4 && month <= 6) return "Q1";      // Apr-Jun
    if (month >= 7 && month <= 9) return "Q2";      // Jul-Sep  
    if (month >= 10 && month <= 12) return "Q3";    // Oct-Dec
    if (month >= 1 && month <= 3) return "Q4";      // Jan-Mar
    
    return "Q1"; // fallback
  };

   // Handle filter changes from FilterControls component
   const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Toggle expand for individual charts
  const toggleExpand = (chartId) => {
    setExpandedCharts(prev => ({
      ...prev,
      [chartId]: !prev[chartId]
    }));
  };
    
  useEffect(() => {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      navigate("/login");
      return;
    }

    // Fetch filter options and exchange rates
    fetchFilterOptions(token);
    fetchExchangeRates(token);
    fetchDashboardData(token);
    fetchCurrentQuarterData(token); 
  }, []);

  useEffect(() => {
    const token = getToken();
    if (token && !isTokenExpired(token)) {
      fetchDashboardData(token);
      // Fetch current quarter data with all filters applied
      fetchCurrentQuarterData(token);
    }
  }, [filters]);

  const fetchCurrentQuarterData = async (token) => {
    try {
      const currentQuarter = getCurrentQuarter();
      const queryParams = new URLSearchParams();
      
      // Apply all current filters to the current quarter data
      Object.keys(filters).forEach(key => {
        if (filters[key] !== "all") {
          queryParams.append(key, filters[key]);
        }
      });
      
      // Override the quarter filter with current quarter
      queryParams.set('quarter', currentQuarter);
  
      const response = await fetch(
        `http://172.28.77.151:8081/dashboard/summary?${queryParams.toString()}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const quarterData = await response.json();
      console.log(quarterData)
      
      setCurrentQuarterData({
        quarter: currentQuarter,
        totalForecast: quarterData.total_forecast_amount,
        totalActual: quarterData.total_actual_amount,
        currencySymbol: quarterData.currency_symbol,
        totalProjects: quarterData.total_projects // Add project count for current quarter
      });
    } catch (err) {
      console.error("Current quarter fetch error:", err);
      // Set fallback data to prevent UI breaking
      setCurrentQuarterData({
        quarter: getCurrentQuarter(),
        totalForecast: 0,
        currencySymbol: getCurrencySymbol(filters.display_currency),
        totalProjects: 0
      });
    }
  };

  const fetchFilterOptions = async (token) => {
    try {
      const response = await fetch("http://172.28.77.151:8081/filters/filters", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const options = await response.json();
      setFilterOptions(options);
    } catch (err) {
      console.error("Filter options fetch error:", err);
    }
  };

  const fetchExchangeRates = async (token) => {
    try {
      const response = await fetch("http://172.28.77.151:8081/dashboard/exchange-rates", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const ratesData = await response.json();
      
      // Convert rates array to object for easier lookup
      const ratesObject = {};
      ratesData.rates.forEach(rate => {
        ratesObject[rate.currency_code] = rate.rate_to_usd;
      });
      setExchangeRates(ratesObject);
      
      // Set conversion info for display
      setConversionInfo({
        lastUpdated: ratesData.last_updated,
        baseCurrency: 'USD'
      });
    } catch (err) {
      console.error("Exchange rates fetch error:", err);
    }
  };

  const fetchDashboardData = async (token) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== "all") {
          queryParams.append(key, filters[key]);
        }
      });

      const response = await fetch(
        `http://172.28.77.151:8081/dashboard/summary?${queryParams.toString()}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const dashboardData = await response.json();
      setData(dashboardData);
      console.log("dashboard data is ",dashboardData)
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      const token = getToken();
      const queryParams = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== "all") {
          queryParams.append(key, filters[key]);
        }
      });

      const response = await fetch(
        `http://172.28.77.151:8081/dashboard/export?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `dashboard_data_${filters.display_currency}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export data");
    }
  };

  // Enhanced currency formatting with better display
  const formatCurrency = (amount, currencyCode = null, showOriginal = false) => {
    const displayCurrency = currencyCode || filters.display_currency;
    const symbol = getCurrencySymbol(displayCurrency);
    
    // Handle very large amounts with proper formatting
    if(displayCurrency === "INR")
    {
      if (Math.abs(amount) >= 10000000) {
        return `${symbol}${(amount / 10000000).toFixed(2)}Cr`;
      } else if (Math.abs(amount) >= 100000) {
        return `${symbol}${(amount / 100000).toFixed(2)}L`;
      } else if (Math.abs(amount) >= 1000) {
        return `${symbol}${(amount / 1000).toFixed(2)}K`;
      } else {
        return `${symbol}${Math.round(amount).toLocaleString()}`;
      }
    }
    else{
      if (Math.abs(amount) >= 100000) {
        return `${symbol}${(amount / 1000000).toFixed(2)}M`;
      } else if (Math.abs(amount) >= 1000) {
        return `${symbol}${(amount / 1000).toFixed(2)}K`;
      } else {
        return `${symbol}${Math.round(amount).toLocaleString()}`;
      }
    }
  };

  if (loading || !data) {
    return (
      <>
        <Header />
        <div className="dashboard-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading dashboard data and exchange rates...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  console.log(data)

  // Prepare chart data with proper month names
  const forecastMonths = Object.keys(data.forecast_by_month)
    .map(Number)
    .sort((a, b) => {
      const aIndex = a >= 4 ? a - 4 : a + 8;
      const bIndex = b >= 4 ? b - 4 : b + 8;
      return aIndex - bIndex;
    });

  const forecastLabels = forecastMonths.map(month => {
    const index = month >= 4 ? month - 4 : month + 8;
    return monthNames[index];
  });

  const forecastValues = forecastMonths.map(month => data.forecast_by_month[month] || 0);
  const actualValues = forecastMonths.map(month => data.actual_by_month?.[month] || 0);
  const differenceValues = forecastMonths.map(month => {
    const forecast = data.forecast_by_month[month] || 0;
    const actual = data.actual_by_month?.[month] || 0;
    if (actual > 0) {
      return actual - forecast;
    }
    else {
      return 0;
    }
  });
  
  function buildCumulative(values) {
    const result = [];
    let prev = 0;
    for (let i = 0; i < values.length; i++) {
      const val = values[i];
      const next = val !== 0 ? prev + val : prev;
      if (next === prev && result.length > 0) {
        result.push(next);
        break;
      }
      result.push(next);
      prev = next;
    }
    return result;
  }
  
  const cumulative = buildCumulative(forecastValues);
  const cumulativeActuals = buildCumulative(actualValues);  


  // Enhanced performance metrics
  const totalForecast = data.total_forecast_amount;
  const totalActual = data.total_actual_amount;
  const avgMonthlyForecast = totalForecast / 12;
  const maxForecast = Math.max(...forecastValues);
  const minForecast = Math.min(...forecastValues);
  const peakMonth = forecastLabels[forecastValues.indexOf(maxForecast)];
  const lowMonth = forecastLabels[forecastValues.indexOf(minForecast)];

  // Current display currency symbol
  const currentSymbol = data.currency_symbol || getCurrencySymbol(filters.display_currency);

  return (
    <>
      <Header />
      <div className="dashboard-container">
      <div className="dashboard-header">
          <div className="dashboard-title">
            <h4>Executive Dashboard</h4>
            <div className="dashboard-actions">
              <button className="btn-secondary" onClick={() => window.location.reload()}>
              🔄 Refresh
            </button>
            {data.role === "SH" && (
              <div className="dashboard-actions">
                <button className="btn-primary" onClick={() => setShowActualModal(true)}>
                  📊 Import Actuals
                </button>

                <button className="btn-primary" onClick={exportData} disabled>
                  🚀 Export PDF
                </button>

                <button className="btn-primary" onClick={() => setShowExchangeModal(true)}>
                  Currency Conversion
                </button>
              </div>
            )}
            </div>
          </div>

          <FilterControls
            filters={filters}
            onFilterChange={handleFilterChange}
            showDashboardSpecific={true}
            className="dashboard-filters"
          />
        </div>

        {/* Enhanced KPI Cards */}
        <div className="kpi-grid">
          <div className="kpi-card primary">
            <div className="kpi-header">
              <h3>Total Projects</h3>
              <span className="kpi-icon">📊</span>
            </div>
            <div className="kpi-value">{data.total_projects.toLocaleString()}</div>
            <div className="kpi-subtitle">All PLM projects</div>
          </div>

          <div className="kpi-card secondary">
            <div className="kpi-header">
              <h3>Total Forecast {`FY-${(parseInt(filters.year) + 1).toString().slice(-2)}${filters.quarter && filters.quarter !== "all" ? ` ${filters.quarter}` : ""}`}
              </h3>
              <span className="kpi-icon">💰</span>
            </div>
            <div className="kpi-value">{formatCurrency(totalForecast)}</div>
            <div className="kpi-subtitle">
              {currentSymbol} {Math.round(totalForecast).toLocaleString()}
              {data.total_forecast_usd && filters.display_currency !== 'USD' && (
                <div className="usd-reference">≈ ${Math.round(data.total_forecast_usd).toLocaleString()} USD</div>
              )}
            </div>
          </div>

          
          <div className="kpi-card tertiary">
            <div className="kpi-header">
            <h3>Total Actual {`FY-${(parseInt(filters.year) + 1).toString().slice(-2)}${filters.quarter && filters.quarter !== "all" ? ` ${filters.quarter}` : ""}`}</h3>
            <span className="kpi-icon">✅</span>
            </div>
            <div className="kpi-value">{formatCurrency(data.total_actual_amount || 0)}</div>
            <div className="kpi-subtitle">
              {currentSymbol} {Math.round(data.total_actual_amount || 0).toLocaleString()}
            </div>
          </div>
          

          <div className="kpi-card quarter">
            <div className="kpi-header">
              <h3>Current Quarter ({currentQuarterData?.quarter || getCurrentQuarter()}) Forecast</h3>
              <span className="kpi-icon">🎯</span>
            </div>
            <div className="kpi-value">
              {currentQuarterData ? 
                formatCurrency(currentQuarterData.totalForecast) : 
                'Loading...'
              }
            </div>
            <div className="kpi-subtitle">
              {currentQuarterData && (
                <>
                  {currentQuarterData.currencySymbol} {Math.round(currentQuarterData.totalForecast).toLocaleString()}
                </>
              )}
            </div>
          </div>

          <div className="kpi-card info">
            <div className="kpi-header">
              <h3>Average Monthly Forecast</h3>
              <span className="kpi-icon">📈</span>
            </div>
            <div className="kpi-value">{formatCurrency(avgMonthlyForecast)}</div>
            <div className="kpi-subtitle">
              {currentSymbol} {Math.round(avgMonthlyForecast).toLocaleString()}
              {data.avgMonthlyForecast && filters.display_currency !== 'USD' && (
                <div className="usd-reference">≈ ${Math.round(data.avgMonthlyForecast).toLocaleString()} USD</div>
              )}
            </div>
          </div>

          <div className="kpi-card warning">
            <div className="kpi-header">
              <h3>Peak Forecast Month</h3>
              <span className="kpi-icon">⭐</span>
            </div>
            <div className="kpi-value">{peakMonth}</div>
            <div className="kpi-subtitle">
              {currentSymbol} {Math.round(maxForecast).toLocaleString()}
              {data.maxForecast && filters.display_currency !== 'USD' && (
                <div className="usd-reference">≈ ${Math.round(data.maxForecast).toLocaleString()} USD</div>
              )}
            </div>
          </div>
        </div>

        <ExchangeRatesModal
          show = {showExchangeModal}
          onClose={() => {setShowExchangeModal(false); window.location.reload()}}
          role = {data.role}
        />
        
        {showActualModal && <ActualsImportModal onClose={() => {setShowActualModal(false); window.location.reload() }} />}
        <ToastContainer position="top-right" autoClose={3000} />

        {/* Expanded Chart Modal - Enhanced */}
        {Object.values(expandedCharts).some(Boolean) && (
          <div className="chart-modal-overlay" onClick={() => setExpandedCharts(prev => Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {}))}>
            <div className="chart-modal enhanced" onClick={(e) => e.stopPropagation()}>
              <div className="chart-modal-header">
                <h3>
                  {expandedCharts.yearlyForecast && `Yearly Forecast vs Actuals - ${filters.display_currency}`}
                  {expandedCharts.monthlyForecast && `Monthly Forecast vs Actuals - ${filters.display_currency}`}
                  {expandedCharts.monthlyForecastVariance && `Monthly Forecast Variance - ${filters.display_currency}`}
                  {expandedCharts.cumulativeForecast && `Revenue Trend- ${filters.display_currency}`}
                  {expandedCharts.quarterlyForecast && `Quarterly Forecast vs Actuals - ${filters.display_currency}`}
                  {expandedCharts.regionalDistribution && "Projects by Region"}
                  {expandedCharts.statusDistribution && "Project Status Distribution"}
                  {expandedCharts.verticalAnalysis && "Projects by Vertical"}
                  {expandedCharts.currencyBreakdown && "Currency Breakdown Analysis"}
                  {expandedCharts.forecastRegion && "Forecast By Region"}
                  {expandedCharts.forecastVertical && "Forecast By Vertical"}
                </h3>
                <button 
                  className="close-btn"
                  onClick={() => setExpandedCharts(prev => Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {}))}
                >
                  ✕
                </button>
              </div>
              <div className="chart-modal-content">
                {expandedCharts.monthlyForecast && (
                  <div className="expanded-chart-container">
                    <Bar
                      data={{
                        labels: forecastLabels,
                        datasets: [
                          {
                            label: `Monthly Forecast (${currentSymbol})`,
                            data: forecastValues,
                            backgroundColor: "rgba(0, 120, 212,0.7)",
                            borderColor: "#106ebe",
                            borderWidth: 2,
                            borderRadius: 6,
                            borderSkipped: false,
                          },
                          {
                            label: `Monthly Actual (${currentSymbol})`,
                            data: actualValues,
                            backgroundColor: "rgba(46, 204, 113, 0.7)",
                            borderColor: "#27ae60",
                            borderWidth: 2,
                            borderRadius: 6,
                            borderSkipped: false,
                          }
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,                        
                        layout: {
                          padding:{
                            top:20
                          }
                        },
                        plugins: {
                          datalabels:{
                            color: 'black',
                            anchor: 'end',
                            align: 'top',
                            formatter: (value, context) => {
                              const formatValue = formatCurrency(value);
                              if(filters.display_currency !== "USD" && data.forecast_by_month_usd) {
                                const usdValue = data.forecast_by_month_usd[forecastMonths[context.dataIndex]] || 0;
                                return [formatValue, `≈ $${Math.round(usdValue).toLocaleString}`];
                              }
                              return formatValue;
                            },
                          },
                          tooltip: {
                            callbacks: {
                              label: (context) => [
                                `${currentSymbol}${context.raw.toLocaleString()}`,
                                filters.display_currency !== 'USD' && data.forecast_by_month_usd ? 
                                `≈ $${Math.round(data.forecast_by_month_usd[forecastMonths[context.dataIndex]] || 0).toLocaleString()} USD` : null
                              ].filter(Boolean)
                            }
                          },
                          legend:{
                            position:'top',
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            // suggestedMax: Math.ceil(maxForecast / 10) * 100,
                            ticks: {
                              callback: (value) => formatCurrency(value)
                            },
                            grid: {
                              color: 'rgba(0,0,0,0.1)'
                            }
                          },
                          x: {
                            grid: {
                              display: false
                            }
                          }
                        }
                      }}
                      plugins={[ChartDataLabels]}
                    />
                    <div className="chart-insights">
                      <div className="insight-item">
                        <strong>Highest:</strong> {peakMonth} - {formatCurrency(maxForecast)}
                      </div>
                      <div className="insight-item">
                        <strong>Lowest:</strong> {lowMonth} - {formatCurrency(minForecast)}
                      </div>
                      <div className="insight-item">
                        <strong>Variance:</strong> {formatCurrency(maxForecast - minForecast)}
                      </div>
                    </div>
                  </div>
                )}

                {expandedCharts.monthlyForecastVariance && (
                  <div className="expanded-chart-container">
                    <Bar
                      data={{
                        labels: forecastLabels,
                        datasets: [
                          {
                            label: `Variance Amount (${currentSymbol})`,
                            data: differenceValues,
                            backgroundColor: differenceValues.map(value =>
                              value >= 0 ? "rgba(0, 200, 83, 0.7)" : "rgba(229, 57, 53, 0.7)"
                            ),
                            borderColor: differenceValues.map(value =>
                              value >= 0 ? "#00c853" : "#e53935"
                            ),
                            borderWidth: 1,
                            borderRadius: 4,
                          },
                        ],                        
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          datalabels:{
                            color: 'black',
                            anchor: 'end',
                            align: 'top',
                            formatter: (value, context) => {
                              return formatCurrency(value);
                            },
                          },
                          tooltip: {
                            callbacks: {
                              label: (context) => `${currentSymbol}${context.raw.toLocaleString()}`
                            },
                          },
                        },
                        scales: {
                          y: {
                            // suggestedMax: Math.ceil(maxForecast / 10) * 100,
                            beginAtZero: true,
                            ticks: {
                              callback: (value) => formatCurrency(value)
                            }
                          }
                        }
                      }}
                      plugins={[ChartDataLabels]}
                    />
                  </div>
                )}
                

                {expandedCharts.yearlyForecast && (
                  <div className="expanded-chart-container">
                    <Bar
                      data={{
                        labels: Object.keys(data.fy_years_actual),
                        datasets: [
                          {
                            label: `yearly forecast (${currentSymbol})`,
                            data: Object.values(data.fy_years_forecast),                      
                            borderColor: "#106ebe",
                            backgroundColor: "rgba(0, 120, 212,0.7)",
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: "#fff",
                            pointBorderColor: "#106ebe",
                            pointBorderWidth: 2,
                            pointRadius: 5,
                            borderWidth: 2,
                          },
                          {
                            label: `yearly actuals (${currentSymbol})`,
                            data: Object.values(data.fy_years_actual),                      
                            borderColor:"#27ae60",
                            backgroundColor: "rgba(46, 204, 113, 0.7)",
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: "#fff",
                            pointBorderColor: "#106ebe",
                            pointBorderWidth: 2,
                            pointRadius: 5,
                            borderWidth: 2,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          datalabels:{
                            color: 'black',
                            anchor: 'end',
                            align: 'top',
                            formatter: (value, context) => {
                              return formatCurrency(value);
                            },
                          },
                          tooltip: {
                            callbacks: {
                                label: (context) => [
                                  `${currentSymbol}${context.raw.toLocaleString()}`,
                                  filters.display_currency !== 'USD' && data.fy_years ? 
                                  `≈ $${Math.round(data.fy_years[Object.keys(fy_years)[context.dataIndex]] || 0).toLocaleString()} USD` : null
                                ].filter(Boolean)
                            }
                          }
                        },
                        scales: {
                          y: {
                            // suggestedMax: Math.ceil(maxForecast / 10) * 100,
                            beginAtZero: true,
                            ticks: {
                              callback: (value) => formatCurrency(value)
                            }
                          }
                        }
                      }}
                      plugins={[ChartDataLabels]}
                    />
                  </div>
                )}
                
                {expandedCharts.cumulativeForecast && (
  <div className="expanded-chart-container">
    <Line
      data={{
        labels: forecastLabels,
        datasets: [
          {
            label: `Forecast Trend (${currentSymbol})`,
            data: cumulative,
            borderColor: "#106ebe",
            backgroundColor: "rgba(0, 120, 212,0.7)",
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#fff",
            pointBorderColor: "#106ebe",
            pointBorderWidth: 2,
            pointRadius: 5,
            borderWidth: 2,
            datalabels: {
              color: 'black',
              anchor: 'end',
              align: 'top',
              formatter: (value) => formatCurrency(value),
            },
          },
          {
            label: `Actuals Trend (${currentSymbol})`,
            data: cumulativeActuals,
            borderColor: "#27ae60",
            backgroundColor: "rgba(46, 204, 113, 0.7)",
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#fff",
            pointBorderColor: "#27ae60",
            pointBorderWidth: 2,
            pointRadius: 5,
            borderWidth: 2,
            datalabels: {
              color: 'black',
              anchor: 'end',
              align: 'bottom',
              offset: 10,
              formatter: (value) => formatCurrency(value),
            },
          }
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => `${currentSymbol}${context.raw.toLocaleString()}`
            }
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => formatCurrency(value)
            }
          }
        }
      }}
      plugins={[ChartDataLabels]}
    />
  </div>
)}
                {expandedCharts.regionalDistribution && (
                  <Doughnut
                    data={{
                      labels: Object.keys(data.projects_by_region),
                      datasets: [
                        {
                          data: Object.values(data.projects_by_region),
                          backgroundColor: [
                            "#FF6384", "#36A2EB", "#FFCE56", 
                            "#88CC88", "#9966FF", "#FF9F40"
                          ],
                          borderWidth: 3,
                          borderColor: "#ffffff",
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: {
                          position: 'bottom',
                        }
                      }
                    }}
                  />
                )}

                {expandedCharts.statusDistribution && (
                  <Doughnut
                    data={{
                      labels: Object.keys(data.projects_by_status),
                      datasets: [
                        {
                          data: Object.values(data.projects_by_status),
                          backgroundColor: [
                            "#28a745", "#ffc107", "#dc3545", 
                            "#6f42c1", "#20c997", "#fd7e14"
                          ],
                          borderWidth: 3,
                          borderColor: "#ffffff",
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                        }
                      },
                    }}
                  />
                )}

                {expandedCharts.verticalAnalysis && data.projects_by_vertical && (
                  <Doughnut
                    data={{
                      labels: Object.keys(data.projects_by_vertical),
                      datasets: [
                        {
                          label: "Projects",
                          data: Object.values(data.projects_by_vertical),
                          backgroundColor: [
                            "#28a745", "#ffc107", "#dc3545", 
                            "#6f42c1", "#20c997", "#fd7e14"
                          ],
                          borderRadius: 6,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: 'y',
                      plugins: {
                        legend: {
                          display: false,
                        }
                      }
                    }}
                  />
                )}

              {expandedCharts.quarterlyForecast && (
                <div className="expanded-chart-container">
                  <Bar
                    data={{
                      labels: Object.keys(data.forecast_by_quarter),
                      datasets: [
                        {
                          label: `Quarterly Forecast (${currentSymbol})`,
                          data: Object.values(data.forecast_by_quarter),
                          backgroundColor: [
                            "rgba(0, 120, 212,0.7)"
                          ],
                          borderColor: [
                            "#106ebe"
                          ],
                          borderWidth: 2,
                          borderRadius: 6,
                          borderSkipped: false,
                        },
                        {
                          label: `Quarterly Actuals (${currentSymbol})`,
                          data: Object.values(data.actual_by_quarter),
                          backgroundColor: [
                            "rgba(46, 204, 113, 0.7)",
                          ],
                          borderColor: [
                            "#27ae60"
                          ],
                          borderWidth: 2,
                          borderRadius: 6,
                          borderSkipped: false,
                        }
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        datalabels:{
                          color: 'black',
                          anchor: 'end',
                          align: 'top',
                          formatter: (value, context) => {
                            return formatCurrency(value);
                          },
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          borderRadius: 4,
                          padding: 3
                        },
                        tooltip: {
                          callbacks: {
                            label: (context) => [
                              `${currentSymbol}${context.raw.toLocaleString()}`,
                              filters.display_currency !== 'USD' && data.total_forecast_usd ? 
                              `≈ $${Math.round(context.raw * (data.total_forecast_usd / data.total_forecast_amount)).toLocaleString()} USD` : null
                            ].filter(Boolean)
                          }
                        },
                        legend: {
                          display: true,
                          position: 'top'
                        }
                      },
                      scales: {
                        y: {
                            suggestedMax: Math.ceil(maxForecast / 10) * 100,
                            beginAtZero: true,
                          ticks: {
                            callback: (value) => formatCurrency(value)
                          },
                          grid: {
                            color: 'rgba(0,0,0,0.1)'
                          }
                        },
                        x: {
                          grid: {
                            display: false
                          }
                        }
                      }
                    }}
                    plugins={[ChartDataLabels]}
                  />
                  <div className="chart-insights">
                    <div className="insight-item">
                      <strong>Highest Quarter:</strong> {
                        Object.keys(data.forecast_by_quarter).reduce((a, b) => 
                          data.forecast_by_quarter[a] > data.forecast_by_quarter[b] ? a : b
                        )
                      } - {formatCurrency(Math.max(...Object.values(data.forecast_by_quarter)))}
                    </div>
                    <div className="insight-item">
                      <strong>Lowest Quarter:</strong> {
                        Object.keys(data.forecast_by_quarter).reduce((a, b) => 
                          data.forecast_by_quarter[a] < data.forecast_by_quarter[b] ? a : b
                        )
                      } - {formatCurrency(Math.min(...Object.values(data.forecast_by_quarter)))}
                    </div>
                    <div className="insight-item">
                      <strong>Total:</strong> {formatCurrency(Object.values(data.forecast_by_quarter).reduce((a, b) => a + b, 0))}
                    </div>
                  </div>
                </div>
              )}

  {expandedCharts.forecastVertical && (
                    <Doughnut
                      data={{
                        labels: Object.keys(data.vertical_forecast),
                        datasets: [
                          {
                            data: Object.values(data.vertical_forecast),
                            backgroundColor: [
                              "#28a745", "#ffc107", "#dc3545", 
                              "#6f42c1", "#20c997", "#fd7e14"
                            ],
                            borderWidth: 3,
                            borderColor: "#ffffff",
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                          }
                        },
                        cutout: '50%',
                      }}
                    />
                  )}

                    {expandedCharts.forecastRegion && (
                                      <Doughnut
                                        data={{
                                          labels: Object.keys(data.region_forecast),
                                          datasets: [
                                            {
                                              data: Object.values(data.region_forecast),
                                              backgroundColor: [
                                                "#28a745", "#ffc107", "#dc3545", 
                                                "#6f42c1", "#20c997", "#fd7e14"
                                              ],
                                              borderWidth: 3,
                                              borderColor: "#ffffff",
                                            },
                                          ],
                                        }}
                                        options={{
                                          responsive: true,
                                          maintainAspectRatio: false,
                                          plugins: {
                                            legend: {
                                              position: 'bottom',
                                            }
                                          },
                                          cutout: '50%',
                                        }}
                                      />
                                    )}

                {expandedCharts.currencyBreakdown && data.currency_breakdown && (
                  <div className="currency-breakdown-expanded">
                    <div className="currency-breakdown-charts">
                      <div className="currency-chart-section">
                        <h4>Projects by Currency</h4>
                        <Doughnut
                          data={{
                            labels: Object.keys(data.currency_breakdown),
                            datasets: [
                              {
                                data: Object.values(data.currency_breakdown).map(item => item.project_count),
                                backgroundColor: [
                                  "#FF6384", "#36A2EB", "#FFCE56", 
                                  "#88CC88", "#9966FF", "#FF9F40"
                                ],
                                borderWidth: 3,
                                borderColor: "#ffffff",
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'bottom',
                              },
                              tooltip: {
                                callbacks: {
                                  label: (context) => {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.raw / total) * 100).toFixed(1);
                                    return `${context.label}: ${context.raw} projects (${percentage}%)`;
                                  }
                                }
                              }
                            },
                            cutout: '100%',
                          }}
                        />
                      </div>
                      <div className="currency-chart-section">
                        <h4>Forecast by Currency (converted to {filters.display_currency})</h4>
                        <Bar
                          data={{
                            labels: Object.keys(data.currency_breakdown),
                            datasets: [
                              {
                                label: `Total Forecast (${currentSymbol})`,
                                data: Object.values(data.currency_breakdown).map(item => item.total_forecast),
                                backgroundColor: "rgba(0, 120, 212,0.7)",
                                borderRadius: 4,
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              tooltip: {
                                callbacks: {
                                  label: (context) => `${currentSymbol}${context.raw.toLocaleString()}`
                                }
                              }
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                ticks: {
                                  callback: (value) => formatCurrency(value)
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="charts-grid">

          {/* Monthly Forecast Bar Chart */}
          <div className="chart-container medium">
            <div className="chart-header">
              <h3>Monthly Forecast vs Actuals ({filters.display_currency})</h3>
              <button 
                onClick={() => toggleExpand('monthlyForecast')} 
                className="expand-btn"
              >
                🔍
              </button>
            </div>
            <div className="chart-content">
              <Bar
                data={{
                  labels: forecastLabels,
                  datasets: [
                    {
                      label: `Monthly Forecast (${currentSymbol})`,
                      data: forecastValues,
                      backgroundColor: "rgba(0, 120, 212,0.7)",
                      borderColor: "#106ebe",
                      borderWidth: 1,
                      borderRadius: 4,
                    },
                    {
                      label: `Monthly Actual (${currentSymbol})`,
                      data: actualValues,
                      backgroundColor: "rgba(46, 204, 113, 0.7)",
                      borderColor: "#27ae60",
                      borderWidth: 1,
                      borderRadius: 4,
                    }
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    tooltip: {
                      callbacks: {
                        label: (context) => `${currentSymbol}${context.raw.toLocaleString()}`
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => formatCurrency(value)
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
                    {/* Quarterly Forecast Bar Chart */}
                    <div className="chart-container medium">
                      <div className="chart-header">
                        <h3>Quarterly Forecast vs Actuals ({filters.display_currency})</h3>
                        <button 
                          onClick={() => toggleExpand('quarterlyForecast')} 
                          className="expand-btn"
                        >
                          🔍
                        </button>
                      </div>
                      <div className="chart-content">
                        <Bar
                          data={{
                            labels: Object.keys(data.actual_by_quarter),
                            datasets: [
                              {
                                label: `Quarterly Forecast (${currentSymbol})`,
                                data: Object.values(data.forecast_by_quarter),
                                backgroundColor: [
                                  "rgba(0, 120, 212,0.7)"
                                  // "rgba(40, 167, 69, 0.3)",   // Green for Q1
                                  // "rgba(255, 193, 7, 0.3)",   // Yellow for Q2  
                                  // "rgba(220, 53, 69, 0.3)",   // Red for Q3
                                  // "rgba(111, 66, 193, 0.3)"   // Purple for Q4
                                ],
                                borderColor: [
                                  "#106ebe"
                                  // "#1e7e34",
                                  // "#e0a800", 
                                  // "#c82333",
                                  // "#5a32a3"
                                ],
                                borderWidth: 1,
                                borderRadius: 4,
                              },
                              {
                                label: `Quarterly Actual (${currentSymbol})`,
                                data: Object.values(data.actual_by_quarter),
                                backgroundColor: [
                                  "rgba(46, 204, 113, 0.7)"
                                  // "#28a745", // Green for Q1
                                  // "#ffc107", // Yellow for Q2  
                                  // "#dc3545", // Red for Q3
                                  // "#6f42c1"  // Purple for Q4
                                ],
                                borderColor: [
                                  "#27ae60"
                                  // "#1e7e34",
                                  // "#e0a800", 
                                  // "#c82333",
                                  // "#5a32a3"
                                ],
                                borderWidth: 1,
                                borderRadius: 4,
                              }
                            ],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              tooltip: {
                                callbacks: {
                                  label: (context) => `${currentSymbol}${context.raw.toLocaleString()}`
                                }
                              },
                              legend: {
                                display: true // Hide legend for cleaner look in small chart
                              }
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                ticks: {
                                  callback: (value) => formatCurrency(value)
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>

                         
        <div className="chart-container medium">
            <div className="chart-header">
              <h3>Yearly Forecast vs Actuals ({filters.display_currency})</h3>
              <button 
                onClick={() => toggleExpand('yearlyForecast')} 
                className="expand-btn"
              >
                🔍
              </button>
            </div>
            <div className="chart-content">
              <Bar
                data={{
                  labels: Object.keys(data.fy_years_actual),
                  datasets: [
                    {
                      label: `Yearly Forecast (${currentSymbol})`,
                      data: Object.values(data.fy_years_forecast),
                      backgroundColor: "rgba(0, 120, 212,0.7)",
                      borderColor: "#106ebe",
                      borderWidth: 1,
                      borderRadius: 4,
                    },
                    {
                      label: `Yearly Actual (${currentSymbol})`,
                      data: Object.values(data.fy_years_actual),
                      backgroundColor: "rgba(46, 204, 113, 0.7)",
                      borderColor: "#27ae60",
                      borderWidth: 1,
                      borderRadius: 4,
                    }
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    tooltip: {
                      callbacks: {
                        label: (context) => `${currentSymbol}${context.raw.toLocaleString()}`
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => formatCurrency(value)
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

           {/* Monthly Forecast Variance Bar Chart */}
           <div className="chart-container medium">
            <div className="chart-header">
              <h3>Monthly Forecast Variance ({filters.display_currency})</h3>
              <button 
                onClick={() => toggleExpand('monthlyForecastVariance')} 
                className="expand-btn"
              >
                🔍
              </button>
            </div>
            <div className="chart-content">
              <Bar
                data={{
                  labels: forecastLabels,
                  datasets: [
                    {
                      label: `Variance Amount (${currentSymbol})`,
                      data: differenceValues,
                      backgroundColor: differenceValues.map(value =>
                        value >= 0 ? "rgba(0, 200, 83, 0.7)" : "rgba(229, 57, 53, 0.7)"
                      ),
                      borderColor: differenceValues.map(value =>
                        value >= 0 ? "#00c853" : "#e53935"
                      ),
                      borderWidth: 1,
                      borderRadius: 4,
                    },
                  ],                  
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    tooltip: {
                      callbacks: {
                        label: (context) => `${currentSymbol}${context.raw.toLocaleString()}`
                      }
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => formatCurrency(value)
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Cumulative Forecast Line Chart */}
          <div className="chart-container medium">         
            <div className="chart-header">
              <h3>Revenue Trend ({filters.display_currency})</h3>
              <button 
                onClick={() => toggleExpand('cumulativeForecast')} 
                className="expand-btn"
              >
                🔍
              </button>
            </div>
            <div className="chart-content">
              <Line
                data={{
                  labels: forecastLabels,
                  datasets: [
                    {
                      label: "Forecast Trend",
                      data: cumulative,                      
                      borderColor: "#106ebe",
                      backgroundColor: "rgba(0, 120, 212,0.7)",
                      fill: true,
                      tension: 0.4,
                      pointBackgroundColor: "#fff",
                      pointBorderColor: "#106ebe",
                      pointBorderWidth: 2,
                      pointRadius: 3,
                      borderWidth: 2,
                    },
                    {
                      label: "Actual Trend",
                      data: cumulativeActuals,                      
                      borderColor: "#27ae60",
                      backgroundColor: "rgba(46, 204, 113, 0.7)",
                      fill: true,
                      tension: 0.4,
                      pointBackgroundColor: "#fff",
                      pointBorderColor: "#27ae60",
                      pointBorderWidth: 2,
                      pointRadius: 3,
                      borderWidth: 2,
                    }
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    tooltip: {
                      callbacks: {
                        label: (context) => `${currentSymbol}${context.raw.toLocaleString()}`
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => formatCurrency(value)
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

            {/* Forecast By Region*/}
            <div className="chart-container medium">
            <div className="chart-header">
              <h3>Forecast By Region</h3>
              <button 
                onClick={() => toggleExpand('forecastRegion')} 
                className="expand-btn"
              >
                🔍
              </button>
            </div>
            <div className="chart-content">
              <Doughnut
                data={{
                  labels: Object.keys(data.region_forecast),
                  datasets: [
                    {
                      data: Object.values(data.region_forecast),
                      backgroundColor: [
                        "#28a745", "#ffc107", "#dc3545", 
                        "#6f42c1", "#20c997", "#fd7e14"
                      ],
                      borderWidth: 2,
                      borderColor: "#ffffff",
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    }
                  },
                  cutout: '50%',
                }}
              />
            </div>
          </div>

            {/* Forecast By Vertical*/}
            <div className="chart-container medium">
            <div className="chart-header">
              <h3>Forecast By Vertical</h3>
              <button 
                onClick={() => toggleExpand('forecastVertical')} 
                className="expand-btn"
              >
                🔍
              </button>
            </div>
            <div className="chart-content">
              <Doughnut
                data={{
                  labels: Object.keys(data.vertical_forecast),
                  datasets: [
                    {
                      data: Object.values(data.vertical_forecast),
                      backgroundColor: [
                        "#28a745", "#ffc107", "#dc3545", 
                        "#6f42c1", "#20c997", "#fd7e14"
                      ],
                      borderWidth: 2,
                      borderColor: "#ffffff",
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    }
                  },
                  cutout: '50%',
                }}
              />
            </div>
          </div>

                
          {/* Regional Distribution */}
          <div className="chart-container medium">
            <div className="chart-header">
              <h3>Projects by Region</h3>
              <button 
                onClick={() => toggleExpand('regionalDistribution')} 
                className="expand-btn"
              >
                🔍
              </button>
            </div>
            <div className="chart-content">
              <Doughnut
                data={{
                  labels: Object.keys(data.projects_by_region),
                  datasets: [
                    {
                      data: Object.values(data.projects_by_region),
                      backgroundColor: [
                        "#FF6384", "#36A2EB", "#FFCE56", 
                        "#88CC88", "#9966FF", "#FF9F40"
                      ],
                      borderWidth: 2,
                      borderColor: "#ffffff",
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Status Distribution */}
          <div className="chart-container medium">
            <div className="chart-header">
              <h3>Projects By Status</h3>
              <button 
                onClick={() => toggleExpand('statusDistribution')} 
                className="expand-btn"
              >
                🔍
              </button>
            </div>
            <div className="chart-content">
              <Doughnut
                data={{
                  labels: Object.keys(data.projects_by_status),
                  datasets: [
                    {
                      data: Object.values(data.projects_by_status),
                      backgroundColor: [
                        "#28a745", "#ffc107", "#dc3545", 
                        "#6f42c1", "#20c997", "#fd7e14"
                      ],
                      borderWidth: 2,
                      borderColor: "#ffffff",
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    }
                  },
                  cutout: '50%',
                }}
              />
            </div>
          </div>

          {/* Vertical Analysis */}
          {data.projects_by_vertical && (
            <div className="chart-container medium">
              <div className="chart-header">
                <h3>Projects by Vertical</h3>
                <button 
                  onClick={() => toggleExpand('verticalAnalysis')} 
                  className="expand-btn"
                >
                  🔍
                </button>
              </div>
              <div className="chart-content">
                <Doughnut
                  data={{
                    labels: Object.keys(data.projects_by_vertical),
                    datasets: [
                      {
                        data: Object.values(data.projects_by_vertical),
                        backgroundColor: [
                          "#28a745", "#ffc107", "#dc3545", 
                          "#6f42c1", "#20c997", "#fd7e14"
                        ],
                        borderWidth: 2,
                        borderColor: "#ffffff",
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                      legend: {
                        position: 'bottom',
                      }
                    },
                    cutout: '50%',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Dashboard;