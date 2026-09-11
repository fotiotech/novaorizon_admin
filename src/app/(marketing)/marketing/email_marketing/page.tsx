"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

export default function EmailMarketingPage() {
  const [templates, setTemplates] = useState([
    {
      id: 1,
      name: "Welcome Email",
      subject: "Welcome to our platform",
      status: "active",
    },
    {
      id: 2,
      name: "Newsletter",
      subject: "Monthly Newsletter",
      status: "active",
    },
    {
      id: 3,
      name: "Product Launch",
      subject: "Exciting new product available",
      status: "draft",
    },
  ]);

  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    content: "",
    type: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (value: string | null) => {
    setFormData((prev) => ({ ...prev, type: value || "" }));
  };

  const handleCreateTemplate = () => {
    if (formData.name && formData.subject && formData.content) {
      const newTemplate = {
        id: Math.max(...templates.map((t) => t.id), 0) + 1,
        name: formData.name,
        subject: formData.subject,
        status: "draft",
      };
      setTemplates([...templates, newTemplate]);
      setFormData({ name: "", subject: "", content: "", type: "" });
    }
  };

  const handleDeleteTemplate = (id: number) => {
    setTemplates(templates.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Marketing</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage your email marketing campaigns
          </p>
        </div>
        <Link
          href="/marketing/email_marketing/suscribers"
          className="text-primary hover:underline"
        >
          View Subscribers
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create Template</CardTitle>
            <CardDescription>
              Design a new email marketing template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Template Name</label>
              <Input
                name="name"
                placeholder="e.g., Welcome Email"
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email Subject</label>
              <Input
                name="subject"
                placeholder="e.g., Welcome to our service"
                value={formData.subject}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Template Type</label>
              <Select value={formData.type} onValueChange={handleTypeChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="promotional">Promotional</SelectItem>
                  <SelectItem value="transactional">Transactional</SelectItem>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                  <SelectItem value="welcome">Welcome</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Content</label>
              <Textarea
                name="content"
                placeholder="Enter your email content here..."
                value={formData.content}
                onChange={handleInputChange}
                className="mt-1 min-h-[150px]"
              />
            </div>
            <Button onClick={handleCreateTemplate} className="w-full">
              Create Template
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Templates</CardTitle>
              <CardDescription>Manage your email templates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{template.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {template.subject}
                    </p>
                    <span
                      className={`text-xs mt-1 inline-block px-2 py-1 rounded ${
                        template.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {template.status}
                    </span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
