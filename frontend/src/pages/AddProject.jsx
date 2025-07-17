import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, isTokenExpired, getAuthHeaders } from "../core/auth";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { jwtDecode } from "jwt-decode";
import './styles/ProjectForm.css';

const AddProject = () => {
  const navigate = useNavigate();
  const [managers, setManagers] = useState([]);
  const [clusterHeads, setClusterHeads] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState({
    project_number: '',
    op_ids: '',
    forecast_type_project_required: ''
  });

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
  

  const [userInfo, setUserInfo] = useState({ id: "",name:"", role: "" });
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const user = {
          id: decoded.user_id || "",
          name: decoded.name || "",
          role: decoded.role || "",
        };
        setUserInfo(user);

        if (userInfo.role === "PM" && userInfo.id) {
          setFormData(prev => ({
          ...prev,
          manager_id: userInfo.id,
          }));
          }  
      } catch (err) {
        console.error("Token decode error:", err);
      }
    }
  }, []); 
  
  useEffect(() => {
    if (userInfo.role === "PM" && userInfo.id) {
      console.log("Setting manager_id to:", userInfo.id);
      setFormData(prev => ({
        ...prev,
        manager_id: userInfo.id,
      }));
    }
  }, [userInfo]);  


  const [formData, setFormData] = useState({
    source_country: "",
    project_number: "",
    op_ids: "",
    project_name: "",
    region: "",
    cluster_id: "",
    manager_id: userInfo.id === "" ? "":userInfo.id,
    customer_name: "",
    customer_group: "",
    vertical: "",
    project_type: "",
    project_group: "",
    execution_country: "",
    currency: "",
    remarks: "",
    status: "Planned",
    forecast_type: "",
    forecasts: {4: '', 5: '', 6: '', 7: '', 8: '', 9: '', 10: '', 11: '', 12: '', 1: '', 2: '', 3: ''}
  });

  console.log("initial form data is," ,formData)

  const [projectTextField, setProjectTextField] = useState(false);
  const [sourceCountryTextField, setSourceCountryTextField] = useState(false);
  const [regionTextField, setRegionTextField] = useState(false);
  const [customerNameTextField, setCustomerNameTextField] = useState(false);
  const [customerGroupTextField, setCustomerGroupTextField] = useState(false);
  const [verticalTextField, setVerticalTextField] = useState(false);
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
          fetch("http://172.28.77.151:8081/projects/managers", {
            headers: getAuthHeaders(),
          }),
          fetch("http://172.28.77.151:8081/projects/cluster-heads", {
            headers: getAuthHeaders(),
          }),
          fetch("http://172.28.77.151:8081/projects/clusters", {
            headers: getAuthHeaders(),
          }),
          fetch("http://172.28.77.151:8081/projects/source-countries/all", {
            headers: getAuthHeaders(),
          }),
          fetch("http://172.28.77.151:8081/projects/project-name/all", {
            headers: getAuthHeaders(),
          }),
          fetch("http://172.28.77.151:8081/projects/customer-name/all", {
            headers: getAuthHeaders(),
          }),
          fetch("http://172.28.77.151:8081/projects/customer-group/all", {
            headers: getAuthHeaders(),
          }),
          fetch("http://172.28.77.151:8081/projects/vertical/all", {
            headers: getAuthHeaders(),
          }),
          fetch("http://172.28.77.151:8081/projects/type/all", {
            headers: getAuthHeaders(),
          }),
          fetch("http://172.28.77.151:8081/projects/group/all", {
            headers: getAuthHeaders(),
          }),
          fetch("http://172.28.77.151:8081/projects/execution-country/all", {
            headers: getAuthHeaders(),
          }),
          fetch("http://172.28.77.151:8081/projects/status/all", {
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

  const validateProjectNumber = (value) => {
    if (!value) return '';
    const regex = /^DP\d{6}$/;
    return regex.test(value) ? '' : 'Project number must start with DP followed by 6 digits (e.g., DP123456)';
  };
  
  const validateOpId = (value) => {
    if (!value) return '';
    const regex = /^OP\d{6}$/;
    return regex.test(value) ? '' : 'OP ID must start with OP followed by 6 digits (e.g., OP123456)';
  };
  
  const validateForecastTypeProjectRequirement = () => {
    if (formData.forecast_type === 'OB' && !formData.project_number) {
      return 'Project number is mandatory when forecast type is OB';
    }
    return '';
  };  

const handleInputChange = (e) => {
  let { name, value } = e.target;

  value = handleTextFieldChange(name, value);

  setFormData((prev) => ({
    ...prev,
    [name]: value,
  }));

  // Clear validation errors when user starts typing
  if (validationErrors[name]) {
    setValidationErrors(prev => ({
      ...prev,
      [name]: ''
    }));
  }
};

const handleBlur = (e) => {
  const { name, value } = e.target;
  let error = '';

  if (name === 'project_number') {
    error = validateProjectNumber(value);
  } else if (name === 'op_ids') {
    error = validateOpId(value);
  }

  setValidationErrors(prev => ({
    ...prev,
    [name]: error
  }));
};

  const handleForecastChange = (month, value) => {
    setFormData(prev => ({
      ...prev,
      forecasts: {
        ...prev.forecasts,
        [month]: value === '' ? '' : (parseInt(value))
      }
    }));
  };

  const handleFinancialYearChange = (e) => {
    setSelectedFinancialYear(parseInt(e.target.value));
  };

  const validateProjectData = async () => {
    const { op_ids, forecast_type, project_number } = formData;
  
    if (!op_ids || !forecast_type) {
      throw new Error("OP IDs and Forecast Type are required");
    }
  
    // Always check for existing OP ID
    const checkUrl = project_number
      ? `http://172.28.77.151:8081/projects/check-op-forecast?op_ids=${encodeURIComponent(op_ids)}&forecast_type=${encodeURIComponent(forecast_type)}&project_number=${encodeURIComponent(project_number)}`
      : `http://172.28.77.151:8081/projects/check-op-forecast?op_ids=${encodeURIComponent(op_ids)}&forecast_type=${encodeURIComponent(forecast_type)}`;
  
    const checkResponse = await fetch(checkUrl, {
      method: 'GET',
      headers: getAuthHeaders()
    });
  
    if (!checkResponse.ok) {
      let errorMessage = "Failed to validate OP ID";
    
      try {
        const errorJson = await checkResponse.json();
        errorMessage = errorJson.detail || errorJson.message || errorMessage;
      } catch (jsonError) {
        const errorText = await checkResponse.text();
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }  
      
    const checkResult = await checkResponse.json();
  
    if (checkResult.exists) {
      throw new Error("OP ID already exists in the system");
    }
  
    if (forecast_type === "OB") {
      if (checkResult.is_new_op && !project_number) {
        throw new Error("Project Number is required for new OP ID with OB forecast");
      }
  
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
    console.log("payload is: ",formData)
    e.preventDefault();
    
    try {
      await validateProjectData();
      
      // Filter and prepare forecasts - only include non-zero values
      const forecastsArray = Object.entries(formData.forecasts)
        .filter(([month, amount]) => {
          const numAmount = parseFloat(amount);
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
        source_country: formData.source_country || "",
        project_number: formData.project_number || "",
        op_ids: formData.op_ids,
        project_name: formData.project_name,
        region: formData.region,
        cluster_id: formData.cluster_id || "",
        manager_id: formData.manager_id || "",
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
  
      const response = await fetch("http://172.28.77.151:8081/projects/", {
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


  const isEditableUntil = (monthIndex, selectedFinancialYear) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // Determine the forecast year for the given month index
    const forecastYear = monthIndex <= 3 ? selectedFinancialYear + 1 : selectedFinancialYear;
    
    // Editable if forecast is for the current month or future months in the current or next financial year
    return forecastYear > currentYear || (forecastYear === currentYear && monthIndex >= currentMonth);
    };
    

    async function getProject() {
      try {
        if (!formData.project_number || formData.project_number.toString().length <= 3) {
          setFormData(prev => ({
            ...prev,
            source_country: "",
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
            forecasts: {
              4: "", 5: "", 6: "", 7: "", 8: "", 9: "", 10: "", 11: "", 12: "",
              1: "", 2: "", 3: ""
            },
          }));
          return;
        }
    
        // Step 1: Get project_id from project_number
        const idRes = await fetch(
          `http://172.28.77.151:8081/projects/project_id_by_number/${formData.project_number}`,
          {
            method: "GET",
            headers: getAuthHeaders(),
          }
        );
    
        const idData = await idRes.json();
        if (!idRes.ok || !idData.project_id) {
          console.error("Project ID not found");
          return;
        }
    
        const project_id = idData.project_id;
    
        // Step 2: Fetch full project details using project_id
        const response = await fetch(
          `http://172.28.77.151:8081/projects/${project_id}`,
          {
            method: "GET",
            headers: getAuthHeaders(),
          }
        );
    
        const result = await response.json();
        console.log("Project response:", result);
    
        if (response.ok) {
          const currentFY = new Date().getMonth() + 1 >= 4 ? new Date().getFullYear() : new Date().getFullYear() - 1;
    
          setFormData({
            source_country: result.source_country || "",
            project_number: result.project_number || "",
            op_ids: result.op_ids || "",
            project_name: result.project_name || "",
            region: result.region || "",
            cluster_id: result.cluster_id || " ",
            manager_id: result.manager_id || "",
            customer_name: result.customer_name || "",
            customer_group: result.customer_group || "",
            vertical: result.vertical || "",
            project_type: result.project_type || "",
            project_group: result.project_group || "",
            execution_country: result.execution_country || "",
            currency: result.currency || "",
            remarks: result.remarks || "",
            status: result.status || "",
            forecast_type: result.forecast_type || "",
            forecastYear: currentFY,
            forecasts: result.forecasts || {
              4: "", 5: "", 6: "", 7: "", 8: "", 9: "", 10: "", 11: "", 12: "",
              1: "", 2: "", 3: ""
            },
          });

          console.log("get projects", formData)
        } else {
          console.error("Failed to fetch project:", result.detail || result.message);
        }
      } catch (error) {
        console.error("Error fetching project:", error);
      }
    }
    

  useEffect(() => {
    const error = validateForecastTypeProjectRequirement();
    setValidationErrors(prev => ({
      ...prev,
      forecast_type_project_required: error
    }));
  }, [formData.forecast_type,formData.project_number]);

  useEffect(() => {
    getProject();
  }, [formData.project_number]);
  
  if (loading) return <div className="loading-container">Loading...</div>;

  const monthNames = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const monthIndices = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

  const checkForecastType = () => {
    if (formData.forecast_type === "OB") {
      return true
    }
    else{
      return false
    }
  }

  return (
    <>
      <Header />
      
      <div className="add-project-container">
        <div className="add-project-content">
          <div className="add-project-header">
            <h2>Add Forecast</h2>
            <h2 className="close-button" onClick={() => navigate("/forecast")}>X</h2>
          </div>

          <form onSubmit={handleSubmit} className="add-project-form">
            <div className="form-grid">
    
            <div className="form-group">
                <label>Forecast Type</label>
                <select
                  name="forecast_type"
                  value={formData.forecast_type}
                  onChange={handleInputChange}
                >
                  <option value="TB">TB</option>
                  <option value="OB">OB</option>
                </select>
              </div>

              <div className="form-group">
                <label>OP IDs *</label>
                {validationErrors.op_ids && (
                  <div className="validation-error-bubble">{validationErrors.op_ids}</div>
                )}
                <input
                  type="text"
                  name="op_ids"
                  value={formData.op_ids}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={validationErrors.op_ids ? 'error' : ''}
                />
              </div>

              <div className="form-group">
                <label>Project ID</label>
                {(validationErrors.project_number || validationErrors.forecast_type_project_required) && (
                  <div className="validation-error-bubble">
                    {validationErrors.project_number || validationErrors.forecast_type_project_required}
                  </div>
                )}
                <input
                  type="text"
                  name="project_number"
                  value={formData.project_number}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  required={checkForecastType()}
                  className={
                    validationErrors.project_number || validationErrors.forecast_type_project_required
                      ? 'error'
                      : ''
                  }
                />
              </div>

              <div className="form-group">
                <label>Project Name</label>
                {projectTextField ? (
                  <div className="input-with-toggle">
                    <input
                      type="text"
                      name="project_name"
                      value={formData.project_name}
                      onChange={handleInputChange}
                      placeholder="Add new project name"
                    />
                    <button
                      type="button"
                      className="toggle-back"
                      onClick={() => {
                        setProjectTextField(false);
                        setFormData(prev => ({ ...prev, project_name: "" }));
                      }}
                    >
                      X
                    </button>
                  </div>
                ) : (
                  <select
                    name="project_name"
                    id="project_name"
                    onChange={handleInputChange}
                    value={formData.project_name}
                  >
                    <option value="">Select Project Name</option>
                    <option value="add">+ Add project name</option>
                    {projectNames.map((projectName, index) => (
                      <option value={projectName} key={projectName + index}>
                        {projectName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label>Project Type</label>
                {projectTypeTextField ? (
                  <div className="input-with-toggle">
                    <input
                      type="text"
                      name="project_type"
                      value={formData.project_type}
                      onChange={handleInputChange}
                      placeholder="Add new project type"
                    />
                    <button
                      type="button"
                      className="toggle-back"
                      onClick={() => {
                        setProjectTypeTextField(false);
                        setFormData(prev => ({ ...prev, project_type: "" }));
                      }}
                    >
                      X
                    </button>
                  </div>
                ) : (
                  <select
                    name="project_type"
                    id="project_type"
                    onChange={handleInputChange}
                    value={formData.project_type}
                  >
                    <option value="">Select Project Type</option>
                    <option value="add">+ Add project type</option>
                    {projectTypes.map((type, index) => (
                      <option key={type + index} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                )}
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
              <label>Project Manager</label>
              <select
                name="manager_id"
                value={formData.manager_id || ""}
                onChange={handleInputChange}
                disabled={userInfo.role === "PM"}
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
                {customerGroupTextField ? (
                  <div className="input-with-toggle">
                    <input
                      type="text"
                      name="customer_group"
                      value={formData.customer_group}
                      onChange={handleInputChange}
                      placeholder="Add new customer group"
                    />
                    <button
                      type="button"
                      className="toggle-back"
                      onClick={() => {
                        setCustomerGroupTextField(false);
                        setFormData(prev => ({ ...prev, customer_group: "" }));
                      }}
                    >
                      X
                    </button>
                  </div>
                ) : (
                  <select
                    name="customer_group"
                    id="customer_group"
                    onChange={handleInputChange}
                    value={formData.customer_group}
                  >
                    <option value="">Select Customer Group</option>
                    <option value="add">+ Add customer group</option>
                    {customerGroups.map((customerGroup, index) => (
                      <option value={customerGroup} key={customerGroup + index}>
                        {customerGroup}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label>Customer Name</label>
                {customerNameTextField ? (
                  <div className="input-with-toggle">
                    <input
                      type="text"
                      name="customer_name"
                      value={formData.customer_name}
                      onChange={handleInputChange}
                      placeholder="Add new customer name"
                    />
                    <button
                      type="button"
                      className="toggle-back"
                      onClick={() => {
                        setCustomerNameTextField(false);
                        setFormData(prev => ({ ...prev, customer_name: "" }));
                      }}
                    >
                      X
                    </button>
                  </div>
                ) : (
                  <select
                    name="customer_name"
                    id="customer_name"
                    onChange={handleInputChange}
                    value={formData.customer_name}
                  >
                    <option value="">Select Customer Name</option>
                    <option value="add">+ Add customer Name</option>
                    {customerNames.map((customerName, index) => (
                      <option value={customerName} key={customerName + index}>
                        {customerName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label>Vertical</label>
                <select
                  name="vertical"
                  value={formData.vertical}
                  onChange={handleInputChange}
                >
                  <option value="">Select Vertical</option>
                  <option value="Aero">Aero</option>
                  <option value="Automotive">Automotive</option>
                  <option value="IHM">IHM</option>
                  <option value="TML SBU">TML SBU</option>
                  <option value="Products">Products</option>
                </select>
              </div>

              <div className="form-group">
                <label>Region</label>
              <select
                  name="region"
                  value={formData.region}
                  onChange={handleInputChange}
                >
                  <option value="">Select region</option>
                  <option value="APAC">APAC</option>
                  <option value="EU">EU</option>
                  <option value="NA">NA</option>
                </select>
                </div>
                
                <div className="form-group">
  <label>Source Country *</label>
  <select
    name="source_country"
    id="source_country"
    onChange={handleInputChange}
    value={formData.source_country}
  >
    <option value="">Select Source Country</option>
    {[
      "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
      "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
      "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
      "Denmark", "Djibouti", "Dominica", "Dominican Republic", "East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
      "Fiji", "Finland", "France",
      "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
      "Haiti", "Honduras", "Hungary",
      "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
      "Jamaica", "Japan", "Jordan",
      "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
      "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
      "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
      "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
      "Oman",
      "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
      "Qatar",
      "Romania", "Russia", "Rwanda",
      "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
      "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
      "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
      "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
      "Yemen",
      "Zambia", "Zimbabwe"
    ].map((country, index) => (
      <option value={country} key={country + index}>
        {country}
      </option>
    ))}
  </select>
</div>

<div className="form-group">
  <label>Execution Country </label>
  <select
    name="execution_country"
    id="execution_country"
    onChange={handleInputChange}
    value={formData.execution_country}
  >
    <option value="">Select Execution Country</option>
    {[
      "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
      "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
      "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
      "Denmark", "Djibouti", "Dominica", "Dominican Republic", "East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
      "Fiji", "Finland", "France",
      "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
      "Haiti", "Honduras", "Hungary",
      "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
      "Jamaica", "Japan", "Jordan",
      "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
      "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
      "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
      "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
      "Oman",
      "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
      "Qatar",
      "Romania", "Russia", "Rwanda",
      "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
      "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
      "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
      "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
      "Yemen",
      "Zambia", "Zimbabwe"
    ].map((country, index) => (
      <option value={country} key={country + index}>
        {country}
      </option>
    ))}
  </select>
</div>

              <div className="form-group">
                <label>Currency</label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                >
                  <option value="">Select Currency</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                  <option value="JPY">JPY</option>
                </select>
              </div>

              <div className="form-group">
                <label>Project Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="Planned">Planned</option>
                  <option value="In Execution">In Execution</option>
                  <option value="Closed">Closed</option>
                  <option value="Technically Closed">Technically Closed</option>
                </select>
              </div>
            </div>

            <div className="form-group remarks-section">
              <label>Remarks</label>
              <textarea
                name="remarks"
                value={formData.remarks}
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
                        FY-{(year+1).toString().slice(-2) }
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="forecasts-grid">
                {monthIndices.map((monthIndex, i) => {
                  const forecastYear =
                    monthIndex <= 3
                      ? selectedFinancialYear + 1
                      : selectedFinancialYear;

                  return (
                    <div key={monthIndex} className="forecast-item">
                      <label>
                        {monthNames[i]} {forecastYear}
                      </label>
                      <input
                        type="number"
                        min="0" // Optional: prevent negative values
                        className="no-spinner" // Use className instead of class
                        value={formData.forecasts[monthIndex]}
                        onChange={(e) =>
                          handleForecastChange(monthIndex, e.target.value)
                        }
                        placeholder="0" // Better placeholder for decimal values
                        style={{ textAlign: "right" }}
                        disabled={!isEditableUntil(monthIndex, selectedFinancialYear)}
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