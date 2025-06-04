"use client";
import { Customer, Users } from "@/constant/types";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { findCustomer } from "../actions/customer";
import { useSession } from "next-auth/react";

// Define the shape of the user context
interface UserContextType {
  user: Users | null;
  customerInfos: Customer | null;
  loading: boolean;
  error: string | null;
  updateCustomerInfo: (updatedData: Partial<Customer>) => void; // Function to update customer info
}

// Create the context with default values
const UserContext = createContext<UserContextType | undefined>(undefined);

// Custom hook for consuming the context
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

// Props type for the provider
interface UserProviderProps {
  children: ReactNode;
}

// UserContextProvider component
export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const initialState: Users = {
    _id: "",
    name: "",
    email: "",
    role: "",
    status: "",
  };

  const initialCustomerState: Customer = {
    _id: "",
    userId: "",
    photo: "",
    language: "",
    billingAddress: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      region: "",
      country: "",
      postalCode: "",
      preferences: [],
    },
    shippingAddress: {
      street: "",
      region: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      carrier: "",
      shippingMethod: "",
    },
    billingMethod: {
      methodType: "", // Can be something like 'Credit Card', 'PayPal'
      details: {
        cardNumber: "",
        expiryDate: "",
        cardholderName: "",
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const session = useSession();
  const userData = session?.data?.user as any;
  const [user, setUser] = useState<Users | null>(initialState);
  const [customerInfos, setCustomerInfos] = useState<Customer | null>(
    initialCustomerState
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to update customer data
  const updateCustomerInfo = (updatedData: Partial<Customer>) => {
    setCustomerInfos((prevCustomerInfos) => {
      if (prevCustomerInfos) {
        return {
          ...prevCustomerInfos,
          ...updatedData,
          billingMethod: prevCustomerInfos.billingMethod, // Keep the existing billingMethod
        };
      }
      return null; // Return null if prevCustomerInfos is null
    });
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (userData) {
          setUser({
            _id: userData?.id || "",
            name: userData?.name || "",
            email: userData?.email || "",
            role: userData?.role || "",
          });
        }

        if (userData?.id) {
          const response = await findCustomer(userData.id);
          if (response) {
            setCustomerInfos(response);
          }
        }
      } catch (err) {
        setError("Failed to fetch user or customer data");
        console.error(err); // Log error for debugging
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []); // Fetch user and customer on component mount

  return (
    <UserContext.Provider
      value={{
        user,
        customerInfos,
        loading,
        error,
        updateCustomerInfo, // Expose the update function in the context
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
