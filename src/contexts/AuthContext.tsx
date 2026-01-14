import { createContext, useContext, useState, ReactNode } from "react";
import { updateLastActivity, clearSessionOnTimeout } from "@/lib/securityStore";

export type UserRole = "admin" | "psw" | "client";

type PSWStatus = "pending" | "active" | "flagged" | "removed";

interface User {
  id: string;
  name: string;
  firstName: string;
  email: string;
  role: UserRole;
  status?: PSWStatus;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (role: UserRole, email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo purposes
const mockUsers: Record<UserRole, User> = {
  admin: {
    id: "admin-1",
    name: "Admin User",
    firstName: "Admin",
    email: "admin@pswdirect.ca",
    role: "admin",
  },
  psw: {
    id: "psw-test-001",
    name: "Test PSW",
    firstName: "Test",
    email: "test.psw@pswdirect.ca",
    role: "psw",
    status: "active",
  },
  client: {
    id: "client-1",
    name: "Margaret Thompson",
    firstName: "Margaret",
    email: "margaret.thompson@email.com",
    role: "client",
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (role: UserRole, email: string) => {
    // Clear any stale timeout data and set fresh activity timestamp
    updateLastActivity();
    
    // In production, this would validate credentials and fetch user data
    const mockUser = { ...mockUsers[role], email };
    setUser(mockUser);
  };

  const logout = () => {
    clearSessionOnTimeout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
