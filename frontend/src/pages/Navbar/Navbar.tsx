import { useState, useEffect } from "react";
import {
  Brain,
  Menu,
  X,
  ChevronDown,
  User,
  LogOut,
  Settings,
  FileText,
  Briefcase,
} from "lucide-react";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoggedIn] = useState(false); // Change to true to see logged-in state

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Features", href: "/features" },
    { name: "How It Works", href: "/how-it-works" },
    { name: "Pricing", href: "/pricing" },
    { name: "For HR", href: "/for-hr" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/95 backdrop-blur-lg shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 group">
            <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-2 rounded-xl group-hover:scale-110 transition-transform">
              <Brain className="text-white" size={28} />
            </div>
            <span
              className={`text-2xl font-bold transition-colors ${
                isScrolled ? "text-slate-900" : "text-white"
              }`}
            >
              Veri<span className="text-cyan-500">Resume</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.href}
                className={`font-medium transition-colors hover:text-cyan-500 ${
                  isScrolled ? "text-slate-700" : "text-white"
                }`}
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            {!isLoggedIn ? (
              <>
                <a
                  href="/login"
                  className={`font-medium px-6 py-2 rounded-lg transition-all ${
                    isScrolled
                      ? "text-slate-700 hover:bg-slate-100"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  Login
                </a>
                <a
                  href="/signup"
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold px-6 py-2 rounded-lg transition-all shadow-lg hover:shadow-xl"
                >
                  Get Started
                </a>
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isScrolled
                      ? "hover:bg-slate-100 text-slate-700"
                      : "hover:bg-white/10 text-white"
                  }`}
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center">
                    <User size={18} className="text-white" />
                  </div>
                  <span className="font-medium">John Doe</span>
                  <ChevronDown size={18} />
                </button>

                {/* Profile Dropdown */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-b border-slate-200">
                      <p className="font-semibold text-slate-900">John Doe</p>
                      <p className="text-sm text-slate-600">john@example.com</p>
                    </div>
                    <div className="py-2">
                      <a
                        href="/dashboard"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-700"
                      >
                        <FileText size={18} className="text-blue-600" />
                        <span>My Resumes</span>
                      </a>
                      <a
                        href="/jobs"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-700"
                      >
                        <Briefcase size={18} className="text-cyan-600" />
                        <span>Job Matches</span>
                      </a>
                      <a
                        href="/settings"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-700"
                      >
                        <Settings size={18} className="text-slate-600" />
                        <span>Settings</span>
                      </a>
                    </div>
                    <div className="border-t border-slate-200">
                      <button className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-red-600 w-full">
                        <LogOut size={18} />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`lg:hidden p-2 rounded-lg transition-colors ${
              isScrolled
                ? "text-slate-700 hover:bg-slate-100"
                : "text-white hover:bg-white/10"
            }`}
          >
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 shadow-xl">
          <div className="px-6 py-4 space-y-4">
            {navLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.href}
                className="block text-slate-700 hover:text-cyan-600 font-medium py-2 transition-colors"
              >
                {link.name}
              </a>
            ))}

            <div className="border-t border-slate-200 pt-4 space-y-3">
              {!isLoggedIn ? (
                <>
                  <a
                    href="/login"
                    className="block w-full text-center text-slate-700 font-medium px-6 py-3 rounded-lg border-2 border-slate-200 hover:border-cyan-500 transition-all"
                  >
                    Login
                  </a>
                  <a
                    href="/signup"
                    className="block w-full text-center bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold px-6 py-3 rounded-lg transition-all shadow-lg"
                  >
                    Get Started
                  </a>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center">
                      <User size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">John Doe</p>
                      <p className="text-sm text-slate-600">john@example.com</p>
                    </div>
                  </div>

                  <a
                    href="/dashboard"
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors text-slate-700"
                  >
                    <FileText size={20} className="text-blue-600" />
                    <span className="font-medium">My Resumes</span>
                  </a>
                  <a
                    href="/jobs"
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors text-slate-700"
                  >
                    <Briefcase size={20} className="text-cyan-600" />
                    <span className="font-medium">Job Matches</span>
                  </a>
                  <a
                    href="/settings"
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors text-slate-700"
                  >
                    <Settings size={20} className="text-slate-600" />
                    <span className="font-medium">Settings</span>
                  </a>

                  <button className="flex items-center justify-center gap-3 w-full p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-red-600 font-medium">
                    <LogOut size={20} />
                    <span>Logout</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
