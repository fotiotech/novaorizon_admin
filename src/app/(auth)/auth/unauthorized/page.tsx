import Link from "next/link";
import { Home, Shield, AlertTriangle } from "lucide-react";

const Unauthorize = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full text-center bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-10 transition-all duration-300 hover:shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-red-100 dark:bg-red-900/30 rounded-full animate-ping"></div>
            <div className="relative flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full">
              <Shield size={32} />
            </div>
          </div>
        </div>
        
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
          Access Denied
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
          You don't have permission to access this page. This area is restricted to authorized users only.
        </p>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6 text-left">
          <h2 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center">
            <Shield size={18} className="mr-2" />
            What can you do?
          </h2>
          <ul className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
            <li>• Contact your administrator for access rights</li>
            <li>• Return to the homepage</li>
            <li>• Sign in with a different account</li>
          </ul>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/"
            className="flex items-center justify-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            <Home size={18} className="mr-2" />
            Go Home
          </Link>
          
          <Link 
            href="/auth/login"
            className="flex items-center justify-center px-5 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors duration-200"
          >
            Sign In
          </Link>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Need help?{" "}
            <a 
              href="mailto:support@example.com" 
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Unauthorize;