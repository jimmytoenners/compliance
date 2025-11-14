"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/store";
import { 
  CheckCircle2, 
  Circle, 
  Rocket, 
  Building2, 
  Shield, 
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Clock,
  FileCheck
} from "lucide-react";

interface ControlTemplate {
  id: string;
  name: string;
  description: string;
  maturity_level: string;
  recommended_for: string;
  estimated_time: string;
  control_count?: number;
}

interface ControlLibraryItem {
  id: string;
  standard: string;
  family: string;
  name: string;
  description: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, token, setUser } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Company profile state
  const [companyName, setCompanyName] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [companyIndustry, setCompanyIndustry] = useState("");
  const [primaryRegulations, setPrimaryRegulations] = useState<string[]>([]);

  // First control state
  const [controls, setControls] = useState<ControlLibraryItem[]>([]);
  const [selectedControl, setSelectedControl] = useState<string>("");
  const [controlLoading, setControlLoading] = useState(false);

  // Template state
  const [templates, setTemplates] = useState<ControlTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [templateLoading, setTemplateLoading] = useState(false);

  const steps = [
    { number: 1, name: "Welcome", icon: Rocket },
    { number: 2, name: "Company Profile", icon: Building2 },
    { number: 3, name: "First Control", icon: Shield },
    { number: 4, name: "Quick Start", icon: Sparkles },
  ];

  // Redirect if onboarding already completed
  useEffect(() => {
    if (user?.onboarding_completed) {
      router.push("/dashboard");
    }
  }, [user, router]);

  // Load controls for step 3
  useEffect(() => {
    if (currentStep === 3 && controls.length === 0) {
      fetchControls();
    }
  }, [currentStep]);

  // Load templates for step 4
  useEffect(() => {
    if (currentStep === 4 && templates.length === 0) {
      fetchTemplates();
    }
  }, [currentStep]);

  const fetchControls = async () => {
    setControlLoading(true);
    try {
      const response = await fetch("http://localhost:8080/api/v1/controls/library", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setControls(data.slice(0, 10)); // Show first 10 controls
      }
    } catch (error) {
      console.error("Failed to fetch controls:", error);
    } finally {
      setControlLoading(false);
    }
  };

  const fetchTemplates = async () => {
    setTemplateLoading(true);
    try {
      const response = await fetch("http://localhost:8080/api/v1/templates", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 2) {
      // Save company profile
      await saveCompanyProfile();
    } else if (currentStep === 3 && selectedControl) {
      // Activate first control
      await activateControl();
    } else if (currentStep === 4 && selectedTemplate) {
      // Activate template and complete onboarding
      await activateTemplateAndComplete();
      return;
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipToEnd = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8080/api/v1/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          onboarding_completed: true,
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Failed to skip onboarding:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveCompanyProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8080/api/v1/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company_name: companyName,
          company_size: companySize,
          company_industry: companyIndustry,
          primary_regulations: primaryRegulations.join(","),
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const activateControl = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8080/api/v1/controls/activated", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          control_library_id: selectedControl,
          review_interval_days: 90,
        }),
      });

      if (!response.ok) {
        console.error("Failed to activate control");
      }
    } catch (error) {
      console.error("Failed to activate control:", error);
    } finally {
      setLoading(false);
    }
  };

  const activateTemplateAndComplete = async () => {
    setLoading(true);
    try {
      // Activate template
      const templateResponse = await fetch(
        `http://localhost:8080/api/v1/templates/${selectedTemplate}/activate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!templateResponse.ok) {
        console.error("Failed to activate template");
      }

      // Mark onboarding as complete
      const profileResponse = await fetch("http://localhost:8080/api/v1/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          onboarding_completed: true,
        }),
      });

      if (profileResponse.ok) {
        const updatedUser = await profileResponse.json();
        setUser(updatedUser);
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRegulation = (reg: string) => {
    setPrimaryRegulations((prev) =>
      prev.includes(reg) ? prev.filter((r) => r !== reg) : [...prev, reg]
    );
  };

  const canProceed = () => {
    if (currentStep === 1) return true;
    if (currentStep === 2) return companyName && companySize;
    if (currentStep === 3) return selectedControl || true; // Optional step
    if (currentStep === 4) return selectedTemplate || true; // Optional step
    return false;
  };

  const getRecommendedTemplate = () => {
    if (!companySize) return null;
    if (companySize === "1-10") return templates.find(t => t.maturity_level === "foundation");
    if (companySize === "11-50") return templates.find(t => t.maturity_level === "growth");
    return templates.find(t => t.maturity_level === "enterprise");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to GRC Compliance Platform
          </h1>
          <p className="text-gray-600">
            Let's get you started on your compliance journey
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isComplete = currentStep > step.number;
              const isCurrent = currentStep === step.number;

              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                        isComplete
                          ? "bg-green-500 border-green-500 text-white"
                          : isCurrent
                          ? "bg-blue-500 border-blue-500 text-white"
                          : "bg-white border-gray-300 text-gray-400"
                      }`}
                    >
                      {isComplete ? (
                        <Check className="h-6 w-6" />
                      ) : (
                        <Icon className="h-6 w-6" />
                      )}
                    </div>
                    <p
                      className={`mt-2 text-sm font-medium ${
                        isCurrent ? "text-blue-600" : "text-gray-500"
                      }`}
                    >
                      {step.name}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-4 transition-all ${
                        isComplete ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card className="p-8 shadow-lg">
          {currentStep === 1 && (
            <div className="text-center space-y-6">
              <Rocket className="h-16 w-16 text-blue-500 mx-auto" />
              <h2 className="text-3xl font-bold text-gray-900">
                Ready to Build Your Compliance Program?
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                This quick setup wizard will help you:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <Building2 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">Set Up Your Company</h3>
                  <p className="text-sm text-gray-600">
                    Tell us about your organization
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">Activate First Control</h3>
                  <p className="text-sm text-gray-600">
                    Start with a single control
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <Sparkles className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">Quick Start Template</h3>
                  <p className="text-sm text-gray-600">
                    Jump-start with a curated set
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-500 italic">
                This will only take a few minutes. You can skip steps or complete later.
              </p>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Building2 className="h-12 w-12 text-blue-500 mx-auto mb-2" />
                <h2 className="text-2xl font-bold text-gray-900">Company Profile</h2>
                <p className="text-gray-600">
                  Help us tailor your compliance experience
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter your company name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="companySize">Company Size *</Label>
                  <select
                    id="companySize"
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="500+">500+ employees</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="companyIndustry">Industry</Label>
                  <Input
                    id="companyIndustry"
                    value={companyIndustry}
                    onChange={(e) => setCompanyIndustry(e.target.value)}
                    placeholder="e.g., FinTech, Healthcare, SaaS"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Primary Regulations (Select all that apply)</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {["GDPR", "ISO27001", "NIS-2", "SOC2", "HIPAA", "PCI-DSS"].map((reg) => (
                      <Badge
                        key={reg}
                        variant={primaryRegulations.includes(reg) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleRegulation(reg)}
                      >
                        {primaryRegulations.includes(reg) && (
                          <Check className="h-3 w-3 mr-1" />
                        )}
                        {reg}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Shield className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <h2 className="text-2xl font-bold text-gray-900">
                  Activate Your First Control
                </h2>
                <p className="text-gray-600">
                  Choose a control to start your compliance journey (optional)
                </p>
              </div>

              {controlLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading controls...</p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h3 className="font-semibold text-blue-900 mb-2">
                      What is a Control?
                    </h3>
                    <p className="text-sm text-blue-800">
                      A control is a security measure or process that helps protect your
                      organization. Each control has a review cycle (default: 90 days) and
                      requires evidence of compliance.
                    </p>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {controls.map((control) => (
                      <div
                        key={control.id}
                        onClick={() => setSelectedControl(control.id)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedControl === control.id
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{control.standard}</Badge>
                              <Badge variant="secondary">{control.family}</Badge>
                            </div>
                            <h3 className="font-semibold text-gray-900">
                              {control.id}: {control.name}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {control.description.slice(0, 150)}...
                            </p>
                          </div>
                          {selectedControl === control.id && (
                            <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 ml-4" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {!selectedControl && (
                    <p className="text-center text-sm text-gray-500 italic">
                      You can skip this step and activate controls later from the Controls page
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Sparkles className="h-12 w-12 text-purple-500 mx-auto mb-2" />
                <h2 className="text-2xl font-bold text-gray-900">
                  Quick Start with a Template
                </h2>
                <p className="text-gray-600">
                  Activate a curated set of controls based on your company size (optional)
                </p>
              </div>

              {templateLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading templates...</p>
                </div>
              ) : (
                <>
                  {companySize && (
                    <div className="bg-purple-50 p-4 rounded-lg mb-4">
                      <h3 className="font-semibold text-purple-900 mb-2">
                        Recommended for You
                      </h3>
                      <p className="text-sm text-purple-800">
                        Based on your company size ({companySize}), we recommend:{" "}
                        <strong>{getRecommendedTemplate()?.name}</strong>
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {templates.map((template) => {
                      const isRecommended =
                        getRecommendedTemplate()?.id === template.id;
                      return (
                        <div
                          key={template.id}
                          onClick={() => setSelectedTemplate(template.id)}
                          className={`p-5 border-2 rounded-lg cursor-pointer transition-all ${
                            selectedTemplate === template.id
                              ? "border-purple-500 bg-purple-50"
                              : isRecommended
                              ? "border-purple-300 bg-purple-50/50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          {isRecommended && (
                            <Badge className="mb-2 bg-purple-500">Recommended</Badge>
                          )}
                          <h3 className="font-bold text-lg mb-2">{template.name}</h3>
                          <p className="text-sm text-gray-600 mb-3">
                            {template.description}
                          </p>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center text-gray-700">
                              <Shield className="h-4 w-4 mr-2" />
                              <span>
                                {template.control_count || "Multiple"} controls
                              </span>
                            </div>
                            <div className="flex items-center text-gray-700">
                              <Clock className="h-4 w-4 mr-2" />
                              <span>{template.estimated_time}</span>
                            </div>
                            <div className="flex items-center text-gray-700">
                              <FileCheck className="h-4 w-4 mr-2" />
                              <span className="text-xs">{template.recommended_for}</span>
                            </div>
                          </div>
                          {selectedTemplate === template.id && (
                            <div className="mt-3">
                              <CheckCircle2 className="h-6 w-6 text-purple-500" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {!selectedTemplate && (
                    <p className="text-center text-sm text-gray-500 italic mt-4">
                      You can skip this step and explore templates later from the Quick Start page
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t">
            <div>
              {currentStep > 1 && (
                <Button variant="outline" onClick={handleBack} disabled={loading}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              {currentStep < 4 && (
                <Button variant="ghost" onClick={handleSkipToEnd} disabled={loading}>
                  Skip & Finish
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={!canProceed() || loading}
                className="min-w-32"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Processing...
                  </div>
                ) : currentStep === 4 ? (
                  <>
                    Complete <CheckCircle2 className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    Next <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
