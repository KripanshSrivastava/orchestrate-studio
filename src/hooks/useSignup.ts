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
      const normalizedData = {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim(),
        password: data.password,
        confirmPassword: data.confirmPassword,
      };

      // Frontend validation
      if (!normalizedData.firstName || !normalizedData.lastName || !normalizedData.email || !normalizedData.password) {
        throw new Error("Please fill in all fields");
      }

      if (!validateEmail(normalizedData.email)) {
        throw new Error("Invalid email format");
      }

      if (normalizedData.password !== normalizedData.confirmPassword) {
        throw new Error("Passwords do not match");
      }

      const passwordValidation = validatePassword(normalizedData.password);
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
            firstName: normalizedData.firstName,
            lastName: normalizedData.lastName,
            email: normalizedData.email,
            password: normalizedData.password,
            confirmPassword: normalizedData.confirmPassword,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.fieldErrors && typeof errorData.fieldErrors === "object") {
          const firstFieldError = Object.values(errorData.fieldErrors)[0];
          if (typeof firstFieldError === "string" && firstFieldError.length > 0) {
            throw new Error(firstFieldError);
          }
        }

        throw new Error(errorData.error || "Signup failed");
      }

      const result = await response.json();

      // Handle successful creation but failed auto-login
      if (result.success && result.autoLogin === false) {
        console.warn("⚠️ Account created, but auto-login unavailable");
        setIsLoading(false);
        alert(result.message || "Account created! Please log in.");
        window.location.reload(); 
        return;
      }

      // Store token in Keycloak JS
      if (result.token) {
        keycloak.token = result.token;
        keycloak.refreshToken = result.refreshToken;
        try {
          keycloak.tokenParsed = JSON.parse(atob(result.token.split(".")[1]));
          keycloak.authenticated = true;
          
          console.log("✅ Signup successful, redirecting to dashboard...");
          navigate("/dashboard", { replace: true });
        } catch (e) {
          console.error("❌ Token parse error", e);
          throw new Error("Invalid token received");
        }
      } else {
        throw new Error("No access token received");
      }
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
