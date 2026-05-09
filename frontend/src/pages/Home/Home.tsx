import { useState, useEffect } from "react";

import {
  Brain,
  FileText,
  Target,
  Shield,
  Upload,
  Zap,
  TrendingUp,
  CheckCircle,
  Star,
  ChevronLeft,
  ChevronRight,
  Globe,
} from "lucide-react";
import Navbar from "../Navbar/Navbar";

const Home = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  useEffect(() => {
    const handleScroll = () => {
      // scroll logic here if needed
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const testimonials = [
    {
      text: "I improved my resume score from 55 to 92 and got hired in 2 weeks!",
      author: "Ayesha",
      role: "Marketing Executive",
      rating: 5,
    },
    {
      text: "Reduced screening time by 60% using VeriResume!",
      author: "Ali",
      role: "HR Manager at TechWave",
      rating: 5,
    },
    {
      text: "The AI suggestions were spot-on. Finally landed my dream job!",
      author: "Sarah",
      role: "Software Developer",
      rating: 5,
    },
  ];

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-600 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fadeIn">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Smarter Resumes.{" "}
                <span className="text-cyan-300">Better Jobs.</span> Powered by
                AI.
              </h1>
              <p className="text-xl text-blue-100">
                Let AI analyze, enhance, and match your resume to the right
                opportunities.
              </p>
              <div className="flex flex-wrap gap-4">
              </div>
            </div>

            <div className="relative">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-cyan-300">
                    <Brain className="animate-pulse" size={32} />
                    <span className="text-lg font-semibold">
                      AI Analyzing Resume...
                    </span>
                  </div>
                  <div className="bg-white/20 rounded-lg p-4 space-y-2">
                    <div className="h-3 bg-cyan-400 rounded w-3/4 animate-pulse"></div>
                    <div className="h-3 bg-cyan-400 rounded w-1/2 animate-pulse delay-100"></div>
                    <div className="h-3 bg-cyan-400 rounded w-5/6 animate-pulse delay-200"></div>
                  </div>
                  <div className="flex gap-2">
                    <FileText className="text-cyan-300" size={24} />
                    <Target className="text-cyan-300" size={24} />
                    <TrendingUp className="text-cyan-300" size={24} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Powerful Features at Your Fingertips
            </h2>
            <p className="text-xl text-slate-600">
              Everything you need to create the perfect resume and land your
              dream job
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Brain,
                title: "AI Resume Analysis",
                desc: "Get instant feedback and improve your resume using AI insights.",
                color: "bg-blue-500",
              },
              {
                icon: Target,
                title: "ATS Optimization",
                desc: "Ensure your resume passes applicant tracking systems (ATS).",
                color: "bg-cyan-500",
              },
              {
                icon: TrendingUp,
                title: "Smart Job Recommendations",
                desc: "Get personalized job matches based on your skills and goals.",
                color: "bg-blue-600",
              },
              {
                icon: Shield,
                title: "Anomaly Detection for HRs",
                desc: "Detect fake or copied resumes instantly using AI authenticity checks.",
                color: "bg-cyan-600",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="group bg-gradient-to-br from-slate-50 to-blue-50 p-8 rounded-2xl border border-slate-200 hover:border-cyan-400 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
              >
                <div
                  className={`${feature.color} w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className="text-white" size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-600">{feature.desc}</p>
              </div>
            ))}
          </div>


        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gradient-to-b from-blue-50 to-cyan-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-slate-600">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-1/3 left-1/4 right-1/4 h-1 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400"></div>

            {[
              {
                step: "1",
                icon: Upload,
                title: "Upload Your Resume",
                desc: "Upload your resume in PDF or DOCX format",
              },
              {
                step: "2",
                icon: Zap,
                title: "AI Analysis",
                desc: "Let AI analyze and enhance it with smart suggestions",
              },
              {
                step: "3",
                icon: CheckCircle,
                title: "Get Matched",
                desc: "Get job recommendations instantly based on your profile",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="relative bg-white p-8 rounded-2xl shadow-lg border border-slate-200 hover:border-cyan-400 transition-all"
              >
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gradient-to-br from-blue-600 to-cyan-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl shadow-lg">
                  {item.step}
                </div>
                <div className="mt-6 text-center">
                  <div className="inline-block bg-gradient-to-br from-blue-100 to-cyan-100 p-4 rounded-xl mb-4">
                    <item.icon className="text-blue-600" size={36} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-slate-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Job Seekers Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-bold text-slate-900">
                Take Your Resume from{" "}
                <span className="text-cyan-600">Average to Outstanding</span>
              </h2>
              <div className="space-y-4">
                {[
                  "Get ATS & readability scores instantly",
                  "Optimize for your target role (Data Analyst, Developer, etc.)",
                  "Apply with confidence using AI-enhanced resumes",
                ].map((point, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle
                      className="text-cyan-600 flex-shrink-0 mt-1"
                      size={24}
                    />
                    <p className="text-lg text-slate-700">{point}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl p-8 border-2 border-blue-200">
              <div className="bg-white rounded-xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-600 font-semibold">
                    Resume Score
                  </span>
                  <span className="text-3xl font-bold text-cyan-600">
                    92/100
                  </span>
                </div>
                <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full"
                    style={{ width: "92%" }}
                  ></div>
                </div>
                <div className="mt-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">ATS Compatibility</span>
                    <span className="text-green-600 font-semibold">
                      Excellent
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Readability</span>
                    <span className="text-green-600 font-semibold">
                      Very Good
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Keyword Match</span>
                    <span className="text-cyan-600 font-semibold">High</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For HR Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-cyan-300">Top Candidates</span>
                  <span className="text-cyan-300">Match Score</span>
                </div>
                {[
                  { name: "John Smith", role: "Senior Developer", score: 95 },
                  {
                    name: "Emma Wilson",
                    role: "Full Stack Engineer",
                    score: 89,
                  },
                  {
                    name: "Michael Chen",
                    role: "Software Architect",
                    score: 87,
                  },
                ].map((candidate, idx) => (
                  <div
                    key={idx}
                    className="bg-white/10 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold">{candidate.name}</p>
                      <p className="text-sm text-cyan-300">{candidate.role}</p>
                    </div>
                    <div className="text-2xl font-bold text-cyan-400">
                      {candidate.score}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-4xl font-bold">
                Hire Smarter with{" "}
                <span className="text-cyan-300">AI Screening</span>
              </h2>
              <div className="space-y-4">
                {[
                  "Upload job description and get ranked candidates instantly",
                  "Detect anomalies or copied resumes automatically",
                  "Compare candidates based on real skill matches",
                ].map((point, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle
                      className="text-cyan-400 flex-shrink-0 mt-1"
                      size={24}
                    />
                    <p className="text-lg text-blue-100">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Power Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-300 rounded-full mix-blend-multiply filter blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-6">
              Powered by Advanced NLP & Machine Learning
            </h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              VeriResume uses natural language processing (NLP) to extract
              skills, detect inconsistencies, and recommend improvements. Our AI
              continuously learns from thousands of real resumes and job
              postings.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            {[
              {
                icon: Brain,
                title: "Natural Language Processing",
                desc: "Advanced NLP understands context and meaning",
              },
              {
                icon: Target,
                title: "Smart Skill Matching",
                desc: "Matches your skills with job requirements",
              },
              {
                icon: Shield,
                title: "Authenticity Detection",
                desc: "AI-powered anomaly and plagiarism detection",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center hover:bg-white/20 transition-all"
              >
                <div className="inline-block bg-white/20 p-4 rounded-xl mb-4">
                  <item.icon size={36} />
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-blue-100">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              What Our Users Say
            </h2>
            <p className="text-xl text-slate-600">
              Join thousands of satisfied professionals
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-200 relative">
              <div className="flex justify-center mb-4">
                {[...Array(testimonials[currentTestimonial].rating)].map(
                  (_, i) => (
                    <Star
                      key={i}
                      className="text-yellow-400 fill-yellow-400"
                      size={24}
                    />
                  )
                )}
              </div>
              <p className="text-xl text-slate-700 text-center mb-6 italic">
                "{testimonials[currentTestimonial].text}"
              </p>
              <div className="text-center">
                <p className="font-bold text-slate-900">
                  {testimonials[currentTestimonial].author}
                </p>
                <p className="text-slate-600">
                  {testimonials[currentTestimonial].role}
                </p>
              </div>

              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={prevTestimonial}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-600 p-2 rounded-full transition-all"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={nextTestimonial}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-600 p-2 rounded-full transition-all"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            {[
              { number: "50K+", label: "Resumes Analyzed" },
              { number: "5K+", label: "HR Professionals" },
              { number: "95%", label: "User Satisfaction" },
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600 mb-2">
                  {stat.number}
                </div>
                <div className="text-slate-600 text-lg">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-slate-600">
              Choose the plan that works for you
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-slate-50 rounded-2xl p-8 border-2 border-slate-200">
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Free</h3>
              <div className="text-4xl font-bold text-slate-900 mb-6">
                $0
                <span className="text-lg text-slate-600 font-normal">
                  /month
                </span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "Basic resume analysis",
                  "Job suggestions",
                  "ATS score",
                  "Limited features",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <CheckCircle className="text-blue-600" size={20} />
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-8 text-white border-2 border-cyan-400 shadow-2xl transform md:scale-105">
              <div className="bg-cyan-400 text-blue-900 px-3 py-1 rounded-full text-sm font-bold inline-block mb-4">
                POPULAR
              </div>
              <h3 className="text-2xl font-bold mb-4">Premium</h3>
              <div className="text-4xl font-bold mb-6">
                $29<span className="text-lg font-normal">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "Full AI enhancement",
                  "Download optimized resume",
                  "Priority analysis",
                  "Unlimited job matches",
                  "Anomaly detection access",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <CheckCircle className="text-cyan-300" size={20} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-900 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Start Building a Smarter Future with VeriResume
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of professionals optimizing their careers with AI.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
                <Brain className="text-cyan-400" size={28} />
                VeriResume
              </h3>
              <p className="text-slate-400">
                AI-powered resume analysis and job matching platform.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                {["Home", "Features", "Pricing", "How It Works"].map(
                  (item, idx) => (
                    <li key={idx}>
                      <a
                        href="#"
                        className="hover:text-cyan-400 transition-colors"
                      >
                        {item}
                      </a>
                    </li>
                  )
                )}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                {["About Us", "Contact", "Careers", "Blog"].map((item, idx) => (
                  <li key={idx}>
                    <a
                      href="#"
                      className="hover:text-cyan-400 transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Connect</h4>
              <div className="flex gap-4">
                <a
                  href="#"
                  className="bg-slate-800 hover:bg-cyan-600 p-3 rounded-lg transition-colors"
                >
                  <Globe size={20} />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 text-center text-slate-400">
            <p>© 2025 VeriResume. All Rights Reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
