
import Link from "next/link";
import { AlertTriangle, RefreshCw, LogIn, Home, Mail } from "lucide-react";

const Error = () => {
  // Common sign-in errors and their user-friendly explanations
  const errorMessages = {
    default: {
      title: "Sign-In Error",
      description:
        "We encountered an issue during sign-in. This might be due to an incorrect email or password, or a temporary service issue.",
    },
    Configuration: {
      title: "Configuration Issue",
      description:
        "There's a problem with our authentication setup. Our team has been notified and is working to resolve it.",
    },
    AccessDenied: {
      title: "Access Denied",
      description:
        "You don't have permission to access this application. Please contact your administrator if you believe this is an error.",
    },
    Verification: {
      title: "Verification Failed",
      description:
        "The verification link may have expired or already been used. Please try signing in again.",
    },
    CredentialsSignin: {
      title: "Invalid Credentials",
      description:
        "The email or password you entered is incorrect. Please check your credentials and try again.",
    },
  };

  // In a real app, you would get the error type from query parameters
  // const searchParams = useSearchParams();
  // const errorType = searchParams.get('error');
  const errorType = "CredentialsSignin"; // This would come from props/query params in real implementation

  const currentError =
    errorMessages[errorType as keyof typeof errorMessages] ||
    errorMessages.default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full text-center bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-10 transition-all duration-300">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-red-100 dark:bg-red-900/30 rounded-full animate-ping"></div>
            <div className="relative flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full">
              <AlertTriangle size={32} />
            </div>
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-4">
          {currentError.title}
        </h1>

        <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
          {currentError.description}
        </p>

        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg mb-6 text-left">
          <h2 className="font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center">
            <AlertTriangle size={18} className="mr-2" />
            Troubleshooting Tips
          </h2>
          <ul className="text-sm text-amber-700 dark:text-amber-200 space-y-1">
            <li>• Check your email and password for typos</li>
            <li>• Ensure your caps lock is off</li>
            <li>• Try resetting your password if you've forgotten it</li>
            <li>• Clear your browser cookies and cache</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Link
            href="/auth/login"
            className="flex items-center justify-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            <LogIn size={18} className="mr-2" />
            Try Again
          </Link>

          <Link
            href="/auth/forgot-password"
            className="flex items-center justify-center px-5 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors duration-200"
          >
            <RefreshCw size={18} className="mr-2" />
            Reset Password
          </Link>
        </div>

        <div className="flex justify-center">
          <Link
            href="/"
            className="flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <Home size={16} className="mr-1" />
            Return to Homepage
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Still having trouble?{" "}
            <a
              href="mailto:support@example.com"
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center mt-1"
            >
              <Mail size={16} className="mr-1" />
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Error;
