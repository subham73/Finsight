import React, { useEffect, useState, useMemo } from "react";
import { getToken, isTokenExpired } from "../core/auth";
import "../pages/styles/FilterControls.css";
import { useNavigate } from "react-router-dom";
 
const FilterControls = ({
  filters,
  onFilterChange,
  showDashboardSpecific = false,
  showProjectSpecific = false,
  className = "",
}) => {
  const [filterOptions, setFilterOptions] = useState({
    regions: [],
    statuses: [],
    clusters: [],
    managers: [],
    currencies: [],
    available_currencies: [],
    verticals: [],
    customer_groups: [],
    project_numbers: [],
  });
  const [loading, setLoading] = useState(true);
  const [allData, setAllData] = useState([]); // Store all data for cascading
  const navigate = useNavigate();
 
  // Enhanced currency symbols mapping
  const getCurrencySymbol = (currencyCode) => {
    const symbols = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      JPY: "¥",
      INR: "₹",
      CNY: "¥",
      AUD: "A$",
    };
    return symbols[currencyCode] || currencyCode;
  };
 
  useEffect(() => {
    fetchFilterOptions();
    fetchAllData(); // Fetch all data for cascading
  }, []);
 
  const fetchFilterOptions = async () => {
    try {
      const token = getToken();
      const response = await fetch("http://172.28.77.151:8081/filters/filters", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
 
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const options = await response.json();
      console.log("Filter options:", options);
      setFilterOptions(options);
    } catch (err) {
      console.error("Filter options fetch error:", err);
    } finally {
      setLoading(false);
    }
  };
 
  // Fetch all data for cascading filters
  const fetchAllData = async () => {
    try {
      const token = getToken();
      const response = await fetch("http://172.28.77.151:8081/filters/all", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
 
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      console.log("All data:", data);
      setAllData(data);
    } catch (err) {
      console.error("All data fetch error:", err);
    }
  };
 
  // Filter data based on current filters
  const filteredData = useMemo(() => {
    return allData.filter(item => {
      // Year filter
      const yearMatch = filters.year === "all" || !filters.year || item.year === filters.year;
     
      // Region filter
      const regionMatch = filters.region === "all" || !filters.region || item.region === filters.region;
     
      // Status filter
      const statusMatch = filters.status === "all" || !filters.status || item.status === filters.status;
     
      // Forecast type filter
      const forecastTypeMatch = filters.forecast_type === "all" || !filters.forecast_type || item.forecast_type === filters.forecast_type;
     
      // Customer group filter
      const customerGroupMatch = filters.customer_group === "all" || !filters.customer_group || item.customer_group === filters.customer_group;
     
      // Vertical filter
      const verticalMatch = filters.vertical === "all" || !filters.vertical || item.vertical === filters.vertical;
     
      // Cluster filter - Fixed comparison
      const clusterMatch = filters.cluster === "all" || !filters.cluster ||
        (item.cluster && item.cluster.id === filters.cluster);
     
      // Manager filter - Fixed comparison
      const managerMatch = filters.manager === "all" || !filters.manager ||
        (item.manager && item.manager.id === filters.manager);

      const projectNumberMatch = filters.project_number === "all" || !filters.project_number || item.project_number === filters.project_number;

      return yearMatch && regionMatch && statusMatch && forecastTypeMatch &&
               customerGroupMatch && verticalMatch && clusterMatch && managerMatch && projectNumberMatch;
    });
  }, [allData, filters]);
 
  // Get available options based on current filtered data
  const getAvailableOptions = useMemo(() => {
    const getUniqueValues = (field, idField = null, nameField = null) => {
      if (idField && nameField) {
        // For objects with id and name
        const uniqueItems = filteredData.reduce((acc, item) => {
          if (item[field] && item[field][idField] && item[field][nameField]) {
            const existing = acc.find(x => x.id === item[field][idField]);
            if (!existing) {
              acc.push({
                id: item[field][idField],
                name: item[field][nameField]
              });
            }
          }
          return acc;
        }, []);
        return uniqueItems.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        // For simple string values
        const uniqueValues = [...new Set(filteredData.map(item => item[field]).filter(Boolean))];
        return uniqueValues.sort();
      }
    };
 
    return {
      regions: getUniqueValues('region'),
      statuses: getUniqueValues('status'),
      clusters: getUniqueValues('cluster', 'id', 'name'),
      managers: getUniqueValues('manager', 'id', 'name'),
      verticals: getUniqueValues('vertical'),
      customer_groups: getUniqueValues('customer_group'),
      years: getUniqueValues('year'),
      forecast_types: getUniqueValues('forecast_type'),
      project_numbers: getUniqueValues ('project_number'),
    };
  }, [filteredData]);
 
  const handleFilterChange = (filterType, value) => {
    console.log(`Filter changed: ${filterType} = ${value}`);
    onFilterChange(filterType, value);
  };
 
  if (loading) {
    return (
      <div className={`filter-controls ${className}`}>
        <div className="filter-loading">Loading filters...</div>
      </div>
    );
  }
 
  console.log("Current filters:", filters);
  console.log("Filtered data count:", filteredData.length);
  console.log("Available options:", getAvailableOptions);
 
  return (
    <>
      <div className={`filter-controls ${className}`}>
        {/* Display Currency Filter - Dashboard specific */}
        {showDashboardSpecific && (
          <div className="filter-group">
            <label>Display Currency:</label>
            <select
              value={filters.display_currency || "USD"}
              onChange={(e) =>
                handleFilterChange("display_currency", e.target.value)
              }
              className="currency-select"
            >
              {filterOptions.available_currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency} ({getCurrencySymbol(currency)})
                </option>
              ))}
            </select>
          </div>
        )}
 
        {/* Financial Year Filter */}
        <div className="filter-group">
          <label>Financial Year:</label>
          <select
            value={filters.year || new Date().getFullYear()}
            onChange={(e) =>
              handleFilterChange("year", parseInt(e.target.value))
            }
          >
            <option value={new Date().getFullYear() + 1}>
              FY-{(new Date().getFullYear()+2).toString().slice(-2)}
            </option>
            <option value={new Date().getFullYear()}>
              FY-{(new Date().getFullYear()+1).toString().slice(-2)}
            </option>
            <option value={new Date().getFullYear() - 1}>
              FY-{(new Date().getFullYear()).toString().slice(-2)}
            </option>
            <option value={new Date().getFullYear() - 2}>
              FY-{(new Date().getFullYear()-1).toString().slice(-2)}
            </option>
          </select>
        </div>
        {/* Quarter Filter - dashboard specific*/}
          {showDashboardSpecific && ( <div className="filter-group">
            <label>Quarter:</label>
            <select
              value={filters.quarter || "all"}
              onChange={(e) => handleFilterChange("quarter", e.target.value)}
            >
             <option value="all">All Quarters</option>
             <option value="Q1">Q1</option>
             <option value="Q2">Q2</option>
             <option value="Q3">Q3</option>
             <option value="Q4">Q4</option>
            </select>
          </div>
          )}
 
        {/* Region Filter */}
        <div className="filter-group">
          <label>Region:</label>
          <select
            value={filters.region || "all"}
            onChange={(e) => handleFilterChange("region", e.target.value)}
          >
            <option value="all">All Regions</option>
            {getAvailableOptions.regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>
 
        {/* Status Filter */}
        <div className="filter-group">
          <label>Project Status:</label>
          <select
            value={filters.status || "all"}
            onChange={(e) => handleFilterChange("status", e.target.value)}
          >
            <option value="all">All Status</option>
            {getAvailableOptions.statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
 
        {/* Forecast type Filter */}
        <div className="filter-group">
          <label>Forecast Type:</label>
          <select
            value={filters.forecast_type || "all"}
            onChange={(e) =>
              handleFilterChange("forecast_type", e.target.value)
            }
          >
            <option value="all">All Types</option>
            {getAvailableOptions.forecast_types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
 
        {/* Customer group Filter */}
        <div className="filter-group">
          <label>Customer Group:</label>
          <select
            value={filters.customer_group || "all"}
            onChange={(e) =>
              handleFilterChange("customer_group", e.target.value)
            }
          >
            <option value="all">All Customer Groups</option>
            {getAvailableOptions.customer_groups.map((customer_group) => (
              <option key={customer_group} value={customer_group}>
                {customer_group}
              </option>
            ))}
          </select>
        </div>
 
        {/* Vertical Filter */}
        <div className="filter-group">
          <label>Vertical:</label>
          <select
            value={filters.vertical || "all"}
            onChange={(e) => handleFilterChange("vertical", e.target.value)}
          >
            <option value="all">All Verticals</option>
            {getAvailableOptions.verticals.map((vertical) => (
              <option key={vertical} value={vertical}>
                {vertical}
              </option>
            ))}
          </select>
        </div>
 
        {/* Cluster Filter */}
        <div className="filter-group">
          <label>Cluster Head:</label>
          <select
            value={filters.cluster || "all"}
            onChange={(e) => handleFilterChange("cluster", e.target.value)}
          >
            <option value="all">All Cluster Heads</option>
            {getAvailableOptions.clusters.map(cluster => (
              <option key={cluster.id} value={cluster.id}>{cluster.name}</option>
            ))}
          </select>
        </div>
 
        {/* Manager Filter */}
        <div className="filter-group">
          <label>Project Manager:</label>
          <select
            value={filters.manager || "all"}
            onChange={(e) => handleFilterChange("manager", e.target.value)}
          >
            <option value="all">All Managers</option>
            {getAvailableOptions.managers.map(manager => (
              <option key={manager.id} value={manager.id}>{manager.name}</option>
            ))}
          </select>
        </div>
 
      {/* Project Number Filter */}
        <div className="filter-group">
          <label>Project ID:</label>
          <select
            value={filters.project_number || "all"}
            onChange={(e) => handleFilterChange("project_number", e.target.value)}
          >
            <option value="all">All Project IDs</option>
            {getAvailableOptions.project_numbers.map((project_number) => (
              <option key={project_number} value={project_number}>
                {project_number}
              </option>
            ))}
          </select>
        </div>
 
        {/* Clear Filters Button */}
        <div className="filter-group filter-actions">
          <button
            className="btn-secondary clear-filters"
            onClick={() => {
              const clearedFilters = {
                region: "all",
                status: "all",
                cluster: "all",
                manager: "all",
                currency: "all",
                vertical: "all",
                customer_group: "all",
                project_number: "all",
                forecast_type: "all",
                ...showProjectSpecific,
                ...(showDashboardSpecific && {
                  display_currency: "USD",
                  year: new Date().getFullYear(),
                  quarter: "all",
                }),
              };
 
              Object.keys(clearedFilters).forEach((key) => {
                handleFilterChange(key, clearedFilters[key]);
              });
            }}
          >
            🔄 Clear Filters
          </button>
        </div>
      </div>
    </>
  );
};
 
export default FilterControls;
 