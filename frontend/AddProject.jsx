import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, isTokenExpired, getAuthHeaders } from "../core/auth";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { jwtDecode } from "jwt-decode";
import './styles/ProjectForm.css';

import Select from "react-select";

const AddProject = () => {
  const navigate = useNavigate();
  const [formErrors, setFormErrors] = useState({});
  const [managers, setManagers] = useState([]);
  const [clusterHeads, setClusterHeads] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);

   /* for Field DropDown */
   const [sourceCountries, setSourceCountries] = useState([]);
   const [projectNames, setProjectNames] = useState([]);
   const [customerNames, setCustomerNames] = useState([]);
   const [customerGroups, setCustomerGroups] = useState([]);
   const [verticals, setVerticals] = useState([]);
   const [projectTypes, setProjectTypes] = useState([]);
   const [projectGroups, setProjectGroups] = useState([]);
   const [executionCountries, setExecutionCountries] = useState([]);
   const [projectStatus, setProjectStatus] = useState([]);
  
  // Get current financial year
  const getCurrentFinancialYear = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    return currentMonth >= 4 ? currentYear : currentYear - 1;
  };

  const [selectedFinancialYear, setSelectedFinancialYear] = useState(getCurrentFinancialYear());
  

  const [userInfo, setUserInfo] = useState({ name: "", role: "" });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserInfo({
          user_id: decoded.user_id || null,
          role: decoded.role || null,
        });
      } catch (err) {
        console.error("Token decode error:", err);
      }
    }
  }, []);

  
  const [formData, setFormData] = useState({
    source_country: "",
    project_number: "",
    op_ids: "",
    project_name: "",
    region: "",
    cluster_id: "",
    manager_id: "",
    customer_name: "",
    customer_group: "",
    vertical: "",
    project_type: "",
    project_group: "",
    execution_country: "",
    currency: "",
    remarks: "",
    status: "",
    forecast_type: "",
    forecasts: {4: '', 5: '', 6: '', 7: '', 8: '', 9: '', 10: '', 11: '', 12: '', 1: '', 2: '', 3: ''}
  });
  useEffect(() => {
    filterAndFetchCustomerNames();
  }, [formData.customer_group]);
  useEffect(() => {
    filterAndFetchSoureCountry();
  }, [formData.region]);

  const [projectTextField, setProjectTextField] = useState(false);
  const [sourceCountryTextField, setSourceCountryTextField] = useState(false);
  const [customerNameTextField, setCustomerNameTextField] = useState(false);
  const [customerGroupTextField, setCustomerGroupTextField] = useState(false);
  const [projectTypeTextField, setProjectTypeTextField] = useState(false);
  const [projectGroupTextField, setProjectGroupTextField] = useState(false);
  const [executionCountryTextField, setExecutionCountryTextField] =
    useState(false);
  const [statusTextField, setStatusTextField] = useState(false);


  useEffect(() => {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const [
          managersRes,
          clusterHeadsRes,
          clustersRes,
          sourceCountryRes,
          projectNameRes,
          customerNameRes,
          customerGroupRes,
          verticalRes,
          projectTypeRes,
          projectGroupRes,
          executionCountryRes,
          statusRes,
        ] = await Promise.all([
          fetch("http://127.0.0.1:8000/projects/managers", {
            headers: getAuthHeaders(),
          }),
          fetch("http://127.0.0.1:8000/projects/cluster-heads", {
            headers: getAuthHeaders(),
          }),
          fetch("http://127.0.0.1:8000/projects/clusters", {
            headers: getAuthHeaders(),
          }),
          fetch("http://127.0.0.1:8000/projects/source-countries/all", {
            headers: getAuthHeaders(),
          }),
          fetch("http://127.0.0.1:8000/projects/project-name/all", {
            headers: getAuthHeaders(),
          }),
          fetch("http://127.0.0.1:8000/projects/customer-name/all", {
            headers: getAuthHeaders(),
          }),
          fetch("http://127.0.0.1:8000/projects/customer-group/all", {
            headers: getAuthHeaders(),
          }),
          fetch("http://127.0.0.1:8000/projects/vertical/all", {
            headers: getAuthHeaders(),
          }),
          fetch("http://127.0.0.1:8000/projects/type/all", {
            headers: getAuthHeaders(),
          }),
          fetch("http://127.0.0.1:8000/projects/group/all", {
            headers: getAuthHeaders(),
          }),
          fetch("http://127.0.0.1:8000/projects/execution-country/all", {
            headers: getAuthHeaders(),
          }),
          fetch("http://127.0.0.1:8000/projects/status/all", {
            headers: getAuthHeaders(),
          }),
        ]);

        if (
          !managersRes.ok ||
          !clusterHeadsRes.ok ||
          !clustersRes.ok ||
          !sourceCountryRes ||
          !projectNameRes ||
          !customerNameRes ||
          !customerGroupRes ||
          !verticalRes ||
          !projectTypeRes ||
          !projectGroupRes ||
          !executionCountryRes ||
          !statusRes
        ) {
          throw new Error("Failed to fetch dropdown data");
        }

        const [
          managersData,
          clusterHeadsData,
          clustersData,
          sourceCountryData,
          projectNameData,
          customerNameData,
          customerGroupData,
          verticalData,
          projectTypeData,
          projectGroupData,
          executionCountryData,
          statusData,
        ] = await Promise.all([
          managersRes.json(),
          clusterHeadsRes.json(),
          clustersRes.json(),
          sourceCountryRes.json(),
          projectNameRes.json(),
          customerNameRes.json(),
          customerGroupRes.json(),
          verticalRes.json(),
          projectTypeRes.json(),
          projectGroupRes.json(),
          executionCountryRes.json(),
          statusRes.json(),
        ]);

        setManagers(managersData);
        setClusterHeads(clusterHeadsData);
        setClusters(clustersData);
        setSourceCountries(sourceCountryData);
        setProjectNames(projectNameData);
        setCustomerNames(customerNameData);
        setCustomerGroups(customerGroupData);
        setVerticals(verticalData);
        setProjectTypes(projectTypeData);
        setProjectGroups(projectGroupData);
        setExecutionCountries(executionCountryData);
        setProjectStatus(statusData);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        alert("Failed to load form data");
        navigate("/forecast");
      }
    };

    fetchData();
  }, [navigate]);

  const textFieldChangeFunctions = {
    project_name: () => setProjectTextField(true),
    source_country: () => setSourceCountryTextField(true),
    region: () => setRegionTextField(true),
    customer_name: () => setCustomerNameTextField(true),
    customer_group: () => setCustomerGroupTextField(true),
    vertical: () => setVerticalTextField(true),
    project_type: () => setProjectTypeTextField(true),
    project_group: () => setProjectGroupTextField(true),
    execution_country: () => setExecutionCountryTextField(true),
    status: () => setStatusTextField(true),
  };

  function handleTextFieldChange(textFieldName, value) {
    if (textFieldName && value === "add") {
      textFieldChangeFunctions[textFieldName]();
      value = "";
    }

    return value;
  }
  
  const isValidProjectNumber = (value) => {
    return /^DP\d{6}$/.test(value);
  };
  
  const handleInputChange = (e) => {
    let { name, value } = e.target;
    
if (name === "project_number" && !isValidProjectNumber(value)) {
      setFormErrors((prev) => ({
        ...prev,
        project_number: "Project Number must start with 'DP' followed by 6 digits",
      }));
    } else {
      setFormErrors((prev) => ({
        ...prev,
        project_number: "",
      }));
    }
  
    value = handleTextFieldChange(name, value);

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleForecastChange = (month, value) => {
    setFormData(prev => ({
      ...prev,
      forecasts: {
        ...prev.forecasts,
        [month]: value === '' ? '' : (parseFloat(value))
      }
    }));
  };

  
  const isEditableUntil = (monthIndex) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    return monthIndex >= currentMonth;
   
   };

  const handleFinancialYearChange = (e) => {
    setSelectedFinancialYear(parseInt(e.target.value));
  };

  const validateProjectData = async () => {
    const { op_ids, forecast_type, project_number } = formData;
    
    if (!op_ids || !forecast_type) {
      throw new Error("OP IDs and Forecast Type are required");
    }
  
    // For OB forecasts, additional validation is needed
    if (forecast_type === "OB") {
      // Check validation with project number
      const checkUrl = project_number 
        ? `http://127.0.0.1:8000/projects/check-op-forecast?op_ids=${encodeURIComponent(op_ids)}&forecast_type=${encodeURIComponent(forecast_type)}&project_number=${encodeURIComponent(project_number)}`
        : `http://127.0.0.1:8000/projects/check-op-forecast?op_ids=${encodeURIComponent(op_ids)}&forecast_type=${encodeURIComponent(forecast_type)}`;
      
      const checkResponse = await fetch(checkUrl, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (!checkResponse.ok) {
        const errorText = await checkResponse.text();
        console.error('Validation error:', errorText);
        
        // Try to parse error message
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.detail || "Failed to validate OP ID");
        } catch {
          throw new Error("Failed to validate OP ID");
        }
      }
      
      const checkResult = await checkResponse.json();
      
      // Handle different validation scenarios
      if (checkResult.exists) {
        throw new Error("OP ID with OB forecast already exists");
      }
      
      // For new OP ID, project number is required
      if (checkResult.is_new_op && !project_number) {
        throw new Error("Project Number is required for new OP ID with OB forecast");
      }
      
      // Show aggregation message if applicable
      if (checkResult.will_aggregate) {
        const confirmAggregation = window.confirm(
          `${checkResult.message}\n\nDo you want to continue and aggregate the forecasts?`
        );
        if (!confirmAggregation) {
          throw new Error("Operation cancelled by user");
        }
      }
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await validateProjectData();
      
      // Filter and prepare forecasts - only include non-zero values
      const forecastsArray = Object.entries(formData.forecasts)
        .filter(([month, amount]) => {
          const numAmount = parseInt(amount);
          return !isNaN(numAmount) && numAmount > 0;
        })
        .map(([month, amount]) => {
          const numericAmount = Number(amount);
          return {
            forecast_type: formData.forecast_type,
            source_country: formData.source_country,
            year: parseInt(month) <= 3 ? selectedFinancialYear + 1 : selectedFinancialYear,
            month: parseInt(month),
            amount: numericAmount
          };
        });
  
      // Validate that at least one forecast is provided
      if (forecastsArray.length === 0) {
        throw new Error("At least one forecast amount is required");
      }
  
      // Create payload
      const payload = {
        source_country: formData.source_country,
        project_number: formData.project_number || null,
        op_ids: formData.op_ids,
        project_name: formData.project_name,
        region: formData.region,
        cluster_id: formData.cluster_id || "" ,
        manager_id: formData.manager_id === null ? null : formData.manager_id,
        customer_name: formData.customer_name || "",
        customer_group: formData.customer_group || "",
        vertical: formData.vertical || "",
        project_type: formData.project_type || "",
        project_group: formData.project_group || "",
        execution_country: formData.execution_country || "",
        currency: formData.currency || "",
        remarks: formData.remarks || "",
        status: formData.status || "",
        forecasts: forecastsArray
      };
  
      console.log('Payload being sent:', JSON.stringify(payload, null, 2));
  
      const response = await fetch("http://127.0.0.1:8000/projects/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        let errorMessage;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.detail || errorJson.message || "Failed to create project";
        } catch {
          errorMessage = errorText || "Failed to create project";
        }
        throw new Error(errorMessage);
      }
  
      const result = await response.json();
      console.log('Success response:', result);
      
      // Show appropriate success message
      if (result.aggregated) {
        alert("OB forecasts aggregated successfully with existing project!");
      } else {
        alert("Project created successfully!");
      }
      
      navigate("/forecast");
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project: " + error.message);
    }
  };

  // Generate financial year options (current year ± 5 years)
  const generateFinancialYearOptions = () => {
    const currentFY = getCurrentFinancialYear();
    const options = [];
    for (let i = currentFY; i <= currentFY + 5; i++) {
      options.push(i);
    }
    return options;
  };

  async function getProject() {
    try {
      if (
        (formData.project_number &&
          formData.project_number.toString().length <= 3) ||
        (formData.op_ids && formData.op_ids.toString().length <= 3)
      ) {
        setFormData((prev) => ({
          ...prev,
          source_country: "",
          // project_number: "",
          // op_ids: "",
          project_name: "",
          region: "",
          cluster_id: "",
          manager_name: "",
          customer_name: "",
          customer_group: "",
          vertical: "",
          project_type: "",
          project_group: "",
          execution_country: "",
          currency: "",
          remarks: "",
          status: "",
          forecast_type: "",
          forecasts: {
            4: "",
            5: "",
            6: "",
            7: "",
            8: "",
            9: "",
            10: "",
            11: "",
            12: "",
            1: "",
            2: "",
            3: "",
          },
        }));
        return;
      }

      if (formData.project_number && formData.op_ids) {
        const response = await fetch(
          `http://127.0.0.1:8000/projects/project_number/${formData.project_number}/${formData.op_ids}`,
          {
            method: "GET",
            headers: getAuthHeaders(),
          }
        );

        const { project, manager_name } = await response.json();

        if (response.ok) {
          setFormData({
            source_country: project.source_country || "",
            project_number: project.project_number || "",
            op_ids: project.op_ids || "",
            project_name: project.project_name || "",
            region: project.region || "",
            cluster_id: project.cluster_id || "",
            manager_name: manager_name || "",
            customer_name: project.customer_name || "",
            customer_group: project.customer_group || "",
            vertical: project.vertical || "",
            project_type: project.project_type || "",
            project_group: project.project_group || "",
            execution_country: project.execution_country || "",
            currency: project.currency || "",
            remarks: project.remarks || "",
            status: project.status || "",
            forecast_type: project.forecast_type || "",
            forecasts: {
              4: "",
              5: "",
              6: "",
              7: "",
              8: "",
              9: "",
              10: "",
              11: "",
              12: "",
              1: "",
              2: "",
              3: "",
            },
          });
        }
      }
    } catch (error) {
      
    }
  }

  useEffect(() => {
    getProject();
  }, [formData.project_number, formData.op_ids]);

  if (loading) return <div className="loading-container">Loading...</div>;

  
  if (loading) return <div className="loading-container">Loading...</div>;

  const monthNames = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const monthIndices = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
  
  function handleSelection(selectedOption, actionMeta) {
    setFormData((prev) => ({
      ...prev,
      [actionMeta.name]: selectedOption.name,
    }));
  }

  /* 
    FUNCTION FOR FILTERING CUSTOMER NAME BASED ON CUSTOMER GROUP
  */

  async function filterAndFetchCustomerNames() {
    try {
      const { customer_group } = formData;
      const token = getToken();

      // isTokenExpired is imported newly
      if (!token || isTokenExpired(token)) {
        navigate("/login");
        return;
      }

      if (customer_group) {
        const response = await fetch(
          `http://127.0.0.1:8000/filters/customer_group=${encodeURIComponent(
            customer_group
          )}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        // GETTING CUSTOMER NAMES
        const customerNameData = await response.json();

        const formattedCustomerName = [];

        customerNameData &&
          customerNameData.forEach((customerName) => {
            formattedCustomerName.push({
              name: customerName,
              label: customerName,
            });
          });
        setCustomerNames(formattedCustomerName);
      }
    } catch (error) {
      throw error;
    }
  }

  /* 
    FUNCTION FOR FILTERING SOURCE COUNTRY BASED ON REGION
  */

  async function filterAndFetchSoureCountry() {
    try {
      const { region } = formData;
      const token = getToken();

      // isTokenExpired is imported newly
      if (!token || isTokenExpired(token)) {
        navigate("/login");
        return;
      }

      if (region) {
        const response = await fetch(
          `http://127.0.0.1:8000/filters/region=${encodeURIComponent(region)}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        // GETTING CUSTOMER NAMES
        const sourceCountryData = await response.json();

        const formattedSourceCountry = [];

        sourceCountryData &&
          sourceCountryData.forEach((sourceCountry) => {
            formattedSourceCountry.push({
              name: sourceCountry,
              label: sourceCountry,
            });
          });
        setSourceCountries(formattedSourceCountry);
      }
    } catch (error) {
      throw error;
    }
  }

  /* 
    FUNCTION FOR FILTERING PROJECT MANAGERS BASED ON CLUSTER HEAD
  */

  async function filterAndFetchProjectManagers() {
    try {
      const { cluster_id: clusterId } = formData;

      const token = getToken();

      if (!token || isTokenExpired(token)) {
        navigate("/login");
        return;
      }

      if (clusterId === "" || !clusterId) {
        return;
      }

      const response = await fetch(
        `http://127.0.0.1:8000/filters/cluster_id=${encodeURIComponent(
          clusterId
        )}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      // GETTING PROJECT MANAGERS
      const projectManagerData = await response.json();

      const formattedProjectManager = [];

      projectManagerData &&
        projectManagerData.forEach((manager) => {
          if (manager) {
            formattedProjectManager.push(manager);
          }
        });

      setManagers(formattedProjectManager);
    } catch (error) {
      throw error;
    }
  }

  return (
    <>
      <Header />
      
      <div className="add-project-container">
        <div className="add-project-content">
          <div className="add-project-header">
            <h2>Add New Project Forecast</h2>
          </div>

          <form onSubmit={handleSubmit} className="add-project-form">
            <div className="form-grid">
            <div className="form-group">
                <label>Forecast Type</label>
                <Select
                  options={[
                    { name: "OB", label: "OB" },
                    { name: "TB", label: "TB" },
                  ]}
                  onChange={handleSelection}
                  value={
                    formData.forecast_type && {
                      value: formData.forecast_type,
                      label: formData.forecast_type,
                    }
                  }
                  name="forecast_type"
                  id="forecast_type"
                  isSearchable
                  placeholder="Select Forecast Type"
                  className="form-selection"
                />
              </div>

              <div className="form-group">
                <label>OP IDs *</label>
                <input
                  type="text"
                  name="op_ids"
                  value={formData.op_ids}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
  <label>Project Number</label>
  <div className="input-with-tooltip">
    <input
      type="text"
      name="project_number"
      value={formData.project_number}
      onChange={handleInputChange}
      className={formErrors.project_number ? "input-error" : ""}
    />
    {formErrors.project_number && (
      <div className="tooltip-error">{formErrors.project_number}</div>
    )}
  </div>
</div>


              <div className="form-group">
                <label>Project Name *</label>
                <div className="flex gap-1">
                  {projectTextField ? (
                    <input
                      type="text"
                      name="project_name"
                      value={formData.project_name}
                      onChange={handleInputChange}
                      placeholder={"Add new project name"}
                      className="form-input"
                    />
                  ) : (
                    <Select
                      options={projectNames}
                      onChange={handleSelection}
                      value={
                        formData.project_name && {
                          value: formData.project_name,
                          label: formData.project_name,
                        }
                      }
                      name="project_name"
                      id="project_name"
                      isSearchable
                      placeholder="Select Project Name"
                      className="form-selection"
                    />
                  )}
                  <button
                    className="chip"
                    onClick={(e) => {
                      e.preventDefault();
                      setProjectTextField(!projectTextField);
                    }}
                  >
                    {projectTextField ? "-" : "+"}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Project Type</label>
                <div className="flex gap-1">
                  {projectTypeTextField ? (
                    <input
                      type="text"
                      name="project_type"
                      value={formData.project_type}
                      onChange={handleInputChange}
                      placeholder={"Add new project type"}
                      className="form-input"
                    />
                  ) : (
                    <Select
                      options={projectTypes}
                      onChange={handleSelection}
                      value={
                        formData.project_type && {
                          value: formData.project_type,
                          label: formData.project_type,
                        }
                      }
                      name="project_type"
                      id="project_type"
                      isSearchable
                      placeholder="Select Project Type"
                      className="form-selection"
                    />
                  )}
                  <button
                    className="chip"
                    onClick={(e) => {
                      e.preventDefault();
                      setProjectTypeTextField(!projectTypeTextField);
                    }}
                  >
                    {projectTypeTextField ? "-" : "+"}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Project Group</label>
                <div className="flex gap-1">
                  {projectGroupTextField ? (
                    <input
                      type="text"
                      name="project_group"
                      value={formData.project_group}
                      onChange={handleInputChange}
                      placeholder={"Add new project group"}
                      className="form-input"
                    />
                  ) : (
                    <Select
                      options={projectGroups}
                      onChange={handleSelection}
                      value={
                        formData.project_group && {
                          value: formData.project_group,
                          label: formData.project_group,
                        }
                      }
                      name="project_group"
                      id="project_group"
                      isSearchable
                      placeholder="Select Project Group"
                      className="form-selection"
                    />
                  )}
                  <button
                    className="chip"
                    onClick={(e) => {
                      e.preventDefault();
                      setProjectGroupTextField(!projectGroupTextField);
                    }}
                  >
                    {projectGroupTextField ? "-" : "+"}
                  </button>
                </div>
              </div>

              <div className="form-group">
              <label>Cluster</label>
              <select
                name="cluster_id"
                value={formData.cluster_id}
                onChange={handleInputChange}
              >
                <option value="">Select Cluster</option>
                {clusters.map(cluster => (
                  <option key={cluster.id} value={cluster.id}>
                    {cluster.name} ({cluster.region})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Manager</label>
              <select
                name="manager_id"
                value={formData.manager_id === null}
                onChange={handleInputChange}
              >
                <option value="">Select Manager</option>
                {managers.map(manager => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name}
                  </option>
                ))}
              </select>
            </div>

              <div className="form-group">
                <label>Customer Group</label>
                <div className="flex gap-1">
                  {customerGroupTextField ? (
                    <input
                      type="text"
                      name="customer_group"
                      value={formData.customer_group}
                      onChange={handleInputChange}
                      placeholder={"Add new customer group"}
                      className="form-input"
                    />
                  ) : (
                    <Select
                      options={customerGroups}
                      onChange={handleSelection}
                      value={
                        formData.customer_group && {
                          value: formData.customer_group,
                          label: formData.customer_group,
                        }
                      }
                      name="customer_group"
                      id="customer_group"
                      isSearchable
                      placeholder="Select Customer Group"
                    />
                  )}
                  <button
                    className="chip"
                    onClick={(e) => {
                      e.preventDefault();
                      setCustomerGroupTextField(!customerGroupTextField);
                    }}
                  >
                    {customerGroupTextField ? "-" : "+"}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Customer Name</label>
                <div className="flex gap-1">
                  {customerNameTextField ? (
                    <input
                      type="text"
                      name="customer_name"
                      value={formData.customer_name}
                      onChange={handleInputChange}
                      placeholder={"Add new customer name"}
                      className="form-input"
                    />
                  ) : (
                    <Select
                      options={customerNames}
                      onChange={handleSelection}
                      value={
                        formData.customer_name && {
                          value: formData.customer_name,
                          label: formData.customer_name,
                        }
                      }
                      name="customer_name"
                      id="customer_name"
                      isSearchable
                      placeholder="Select Customer Name"
                      className="form-selection"
                    />
                  )}
                  <button
                    className="chip"
                    onClick={(e) => {
                      e.preventDefault();
                      setCustomerNameTextField(!customerNameTextField);
                    }}
                  >
                    {customerNameTextField ? "-" : "+"}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Vertical</label>
                <Select
                  options={verticals}
                  onChange={handleSelection}
                  value={
                    formData.vertical && {
                      value: formData.vertical,
                      label: formData.vertical,
                    }
                  }
                  name="vertical"
                  id="vertical"
                  isSearchable
                  placeholder="Select Vertical"
                  className="form-selection"
                />
              </div>

              <div className="form-group">
                <label>Region *</label>
                <Select
                  options={[
                    { name: "APAC", label: "APAC" },
                    { name: "EU", label: "EU" },
                    { name: "NA", label: "NA" },
                  ]}
                  onChange={handleSelection}
                  value={
                    formData.region && {
                      value: formData.region,
                      label: formData.region,
                    }
                  }
                  name="region"
                  id="region"
                  isSearchable
                  placeholder="Select Region"
                  className="form-selection"
                />
              </div>

              <div className="form-group">
                <label>Source Country *</label>
                <div className="flex gap-1">
                  {sourceCountryTextField ? (
                    <input
                      type="text"
                      name="source_country"
                      value={formData.source_country}
                      onChange={handleInputChange}
                      placeholder={"Add new source country"}
                      className="form-input"
                    />
                  ) : (
                    <Select
                      options={sourceCountries}
                      onChange={handleSelection}
                      value={
                        formData.source_country && {
                          value: formData.source_country,
                          label: formData.source_country,
                        }
                      }
                      name="source_country"
                      id="source_country"
                      isSearchable
                      placeholder="Select Source Country"
                      className="form-selection"
                    />
                  )}
                  <button
                    className="chip"
                    onClick={(e) => {
                      e.preventDefault();
                      setSourceCountryTextField(!sourceCountryTextField);
                    }}
                  >
                    {sourceCountryTextField ? "-" : "+"}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Execution Country</label>
                <div className="flex gap-1">
                  {executionCountryTextField ? (
                    <input
                      type="text"
                      name="execution_country"
                      value={formData.execution_country}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Add new Execution country"
                    />
                  ) : (
                    <Select
                      options={executionCountries}
                      onChange={handleSelection}
                      value={
                        formData.execution_country && {
                          value: formData.execution_country,
                          label: formData.execution_country,
                        }
                      }
                      name="execution_country"
                      id="execution_country"
                      isSearchable
                      placeholder="Select Execution Country"
                      className="form-selection"
                    />
                  )}
                  <button
                    className="chip"
                    onClick={(e) => {
                      e.preventDefault();
                      setExecutionCountryTextField(!executionCountryTextField);
                    }}
                  >
                    {executionCountryTextField ? "-" : "+"}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Currency</label>
                <Select
                  options={[
                    { name: "USD", label: "USD" },
                    { name: "EUR", label: "EUR" },
                    { name: "GBP", label: "GBP" },
                    { name: "INR", label: "INR" },
                    { name: "JPY", label: "JPY" },
                  ]}
                  onChange={handleSelection}
                  value={
                    formData.currency && {
                      value: formData.currency,
                      label: formData.currency,
                    }
                  }
                  name="currency"
                  id="currency"
                  isSearchable
                  placeholder="Select Currency"
                  className="form-selection"
                />
              </div>

              <div className="form-group">
                <label>Project Status</label>
                <Select defaultValue={"Planned"}
                  options={[
                    { name: "Planned", label: "Planned" },
                    { name: "In-Execution", label: "In-Execution" },
                    { name: "Technically-Closed", label: "Technically-Closed" },
                    { name: "Closed", label: "Closed" },
                  ]}
                  onChange={handleSelection}
                  value={
                    formData.status && {
                      value: formData.status,
                      label: formData.status,
                    }
                  }
                  name="status"
                  id="status"
                  isSearchable
                  placeholder="Select Project Status"
                  className="form-selection"
                />
              </div>
            </div>

            <div className="form-group remarks-section">
              <label>Remarks</label>
              <textarea
                name="remarks"
                value={formData.remarks || formData.remarks}
                onChange={handleInputChange}
                rows={1}
                placeholder="Enter any additional remarks or notes..."
              />
            </div>

            <div className="forecasts-section">
              <div className="forecasts-header">
                <h3>Monthly Forecasts</h3>
                <div className="financial-year-selector">
                  <label>Financial Year:</label>
                  <select
                    value={selectedFinancialYear}
                    onChange={handleFinancialYearChange}
                  >
                    {generateFinancialYearOptions().map((year) => (
                      <option key={year} value={year}>
                        FY-{year + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="forecasts-grid">
              {monthIndices.map((monthIndex, i) => {
                const forecastYear = monthIndex <= 3 ? selectedFinancialYear + 1 : selectedFinancialYear;

                // Get current month (0-indexed)
                const currentMonth = new Date().getMonth() + 1;

                // Enable input only if it's the current month
                const isEditable = monthIndex === currentMonth;

                return (
                  <div key={monthIndex} className="forecast-item">
                    <label>{monthNames[i]} {forecastYear}</label>
                    <input
                      type="number"
                      className="no-spinner"
                      value={formData.forecasts[monthIndex]}
                      onChange={(e) => handleForecastChange(monthIndex, e.target.value)}
                      style={{ textAlign: "right" }}
                      disabled={!isEditableUntil(monthIndex)}
                    />
                  </div>
                );
              })}
            </div>
            </div>

            <div className="action-buttons">
              <button type="submit" className="btn btn-primary">
                Create Forecast
              </button>
              <button
                type="button"
                onClick={() => navigate("/forecast")}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <Footer />
    </>
  );
};

export default AddProject;