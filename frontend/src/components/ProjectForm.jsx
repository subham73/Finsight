import React, { useState, useEffect } from "react";

const initialForecast = { year: "", month: "", amount: "", source_country: "" };

const ProjectForm = ({ mode = "add", initialData = {}, onSubmit }) => {
  const [form, setForm] = useState({
    title: "",
    customer_id: "",
    region: "",
    status: "",
    start_date: "",
    end_date: "",
    forecast_type: "",
    ...initialData,
  });

  const [forecasts, setForecasts] = useState(initialData.forecasts || [initialForecast]);

  useEffect(() => {
    if (initialData.forecasts) {
      setForecasts(initialData.forecasts);
      setForm((f) => ({
        ...f,
        forecast_type: initialData.forecasts[0]?.forecast_type || "",
      }));
    }
  }, [initialData]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleForecastChange = (index, e) => {
    const updated = [...forecasts];
    updated[index][e.target.name] = e.target.value;
    setForecasts(updated);
  };

  const addForecast = () => {
    setForecasts([...forecasts, initialForecast]);
  };

  const removeForecast = (index) => {
    const updated = forecasts.filter((_, i) => i !== index);
    setForecasts(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      forecasts: forecasts.map((f) => ({
        ...f,
        forecast_type: form.forecast_type,
      })),
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded">
      <h2 className="text-xl font-bold">{mode === "edit" ? "Edit Project" : "Add Project"}</h2>

      <input name="title" value={form.title} onChange={handleChange} placeholder="Project Title" required />
      <input name="customer_id" value={form.customer_id} onChange={handleChange} placeholder="Customer ID" required />
      <input name="region" value={form.region} onChange={handleChange} placeholder="Region" required />
      <input name="status" value={form.status} onChange={handleChange} placeholder="Status" required />
      <input name="start_date" type="date" value={form.start_date} onChange={handleChange} required />
      <input name="end_date" type="date" value={form.end_date} onChange={handleChange} required />

      <div>
        <label>Forecast Type</label>
        <input name="forecast_type" value={form.forecast_type} onChange={handleChange} placeholder="Forecast Type" required />
      </div>

      <div>
        <h3 className="font-semibold">Forecasts</h3>
        {forecasts.map((f, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input name="source_country" value={f.source_country} onChange={(e) => handleForecastChange(i, e)} placeholder="Country" required />
            <input name="year" type="number" value={f.year} onChange={(e) => handleForecastChange(i, e)} placeholder="Year" required />
            <input name="month" type="number" value={f.month} onChange={(e) => handleForecastChange(i, e)} placeholder="Month" required />
            <input name="amount" type="number" value={f.amount} onChange={(e) => handleForecastChange(i, e)} placeholder="Amount" required />
            <button type="button" onClick={() => removeForecast(i)}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={addForecast}>Add Forecast</button>
      </div>

      <button type="submit">{mode === "edit" ? "Update" : "Create"} Project</button>
    </form>
  );
};

export default ProjectForm;
