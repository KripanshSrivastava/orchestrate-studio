import { useState } from "react";
import { useNavigate } from "react-router-dom";
import keycloak from "@/auth/keycloak";
import { validateEmail, validatePassword } from "@/lib/validations";

interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export const useSignup = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const signup = async (data: SignupData) => {
    setError("");
    setIsLoading(true);

    try {
      // Frontend validation
      if (!data.firstName || !data.lastName || !data.email || !data.password) {
        throw new Error("Please fill in all fields");
      }

      if (!validateEmail(data.email)) {
        throw new Error("Invalid email format");
      }

      if (data.password !== data.confirmPassword) {
        throw new Error("Passwords do not match");
      }

      const passwordValidation = validatePassword(data.password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors[0] || "Password is too weak");
      }

      // Call backend signup API
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/signup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            password: data.password,
            confirmPassword: data.confirmPassword,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Signup failed");
      }

      const result = await response.json();

      // Store token in Keycloak JS
      keycloak.token = result.token;
      keycloak.refreshToken = result.refreshToken;
      keycloak.tokenParsed = JSON.parse(
        atob(result.token.split(".")[1])
      );
      keycloak.authenticated = true;

      console.log("✅ Signup successful, redirecting to dashboard...");

      // Redirect to dashboard
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Signup failed";
      console.error("❌ Signup error:", errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    signup,
    isLoading,
    error,
    setError,
  };
};

export default useSignup;
