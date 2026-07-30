"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";

const BATCH_OPTIONS = [
  "Selection Pro Batch",
  "Selection 1.0 Batch",
  "Arambh Batch",
  "Manzil Batch",
  "No Batch",
];

export default function RegisterForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);

  async function onSubmit(data) {
    setServerError("");
    try {
      const res = await axios.post("/api/auth/register", data);
      localStorage.setItem("accessToken", res.data.accessToken);
      setSuccess(true);
    } catch (err) {
      setServerError(err.response?.data?.error || "Registration failed. Try again.");
    }
  }

  if (success) {
    return <p className="text-green-600 font-medium">Registration successful! Aap login ho chuke hain.</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <div>
        <label className="block mb-1 font-medium">Name</label>
        <input
          {...register("name", { required: "Name required hai" })}
          className="w-full border rounded px-3 py-2"
        />
        {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block mb-1 font-medium">Email</label>
        <input
          type="email"
          {...register("email", { required: "Email required hai" })}
          className="w-full border rounded px-3 py-2"
        />
        {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block mb-1 font-medium">Phone</label>
        <input {...register("phone")} className="w-full border rounded px-3 py-2" />
      </div>

      <div>
        <label className="block mb-1 font-medium">Password</label>
        <input
          type="password"
          {...register("password", {
            required: "Password required hai",
            minLength: { value: 8, message: "Kam se kam 8 characters" },
          })}
          className="w-full border rounded px-3 py-2"
        />
        {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
      </div>

      <div>
        <label className="block mb-1 font-medium">Atomic Pathshala Batch</label>
        <select
          {...register("batch", { required: "Batch select karna zaroori hai" })}
          className="w-full border rounded px-3 py-2"
          defaultValue=""
        >
          <option value="" disabled>
            -- Batch select karein --
          </option>
          {BATCH_OPTIONS.map((batch) => (
            <option key={batch} value={batch}>
              {batch}
            </option>
          ))}
        </select>
        {errors.batch && <p className="text-red-500 text-sm">{errors.batch.message}</p>}
      </div>

      {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
      >
        {isSubmitting ? "Registering..." : "Register"}
      </button>
    </form>
  );
}
