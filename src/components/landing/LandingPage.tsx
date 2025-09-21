'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/auth/AuthModal';
import { useRouter } from 'next/navigation';
import { 
  Brain, 
  Database, 
  MessageSquare, 
  Zap, 
  FileText, 
  Youtube, 
  Globe, 
  ArrowRight,
  CheckCircle,
  Star
} from 'lucide-react';

const LandingPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');

  const handleGetStarted = () => {
    if (user) {
      router.push('/books');
    } else {
      setAuthMode('signup');
      setAuthModalOpen(true);
    }
  };

  const handleSignIn = () => {
    if (user) {
      router.push('/books');
    } else {
      setAuthMode('signin');
      setAuthModalOpen(true);
    }
  };

  const features = [
    {
      icon: <Brain className="h-8 w-8 text-primary" />,
      title: "AI-Powered Analysis",
      description: "Advanced AI understands and analyzes your content from multiple sources."
    },
    {
      icon: <Database className="h-8 w-8 text-primary" />,
      title: "Multi-Source Integration",
      description: "Connect websites, YouTube videos, PDFs, and more in one unified workspace."
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-primary" />,
      title: "Intelligent Chat",
      description: "Ask questions and get insights from all your sources through natural conversation."
    },
    {
      icon: <Zap className="h-8 w-8 text-primary" />,
      title: "Real-time Processing",
      description: "Instant analysis and responses as you add new sources to your knowledge base."
    }
  ];

  const sourceTypes = [
    { icon: <Globe className="h-6 w-6" />, name: "Websites", description: "Any web page or article" },
    { icon: <Youtube className="h-6 w-6" />, name: "YouTube", description: "Video content and transcripts" },
    { icon: <FileText className="h-6 w-6" />, name: "Documents", description: "PDFs and text files" }
  ];

  const benefits = [
    "Save hours of research time",
    "Connect insights across sources",
    "Never lose important information",
    "Get instant answers to complex questions",
    "Organize knowledge effortlessly"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
              <Brain className="h-12 w-12 text-primary" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Your AI-Powered
            <span className="block text-primary">Knowledge Companion</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
            MindLens transforms how you capture, organize, and explore knowledge. 
            Connect multiple sources, ask intelligent questions, and discover insights 
            you never knew existed.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              className="text-lg px-8 py-4 h-auto"
              onClick={handleGetStarted}
            >
              {user ? 'Open MindLens' : 'Get Started Free'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            {!user && (
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-4 h-auto"
                onClick={handleSignIn}
              >
                Sign In
              </Button>
            )}
          </div>

          {user && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 max-w-md mx-auto mb-12">
              <p className="text-sm text-primary font-medium">
                Welcome back, {user.name}! Ready to continue exploring?
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Powerful Features for Knowledge Workers
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to turn scattered information into organized, actionable insights.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="text-center p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Source Types Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Connect Any Source
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            MindLens works with all your favorite content types and platforms.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {sourceTypes.map((type, index) => (
            <div 
              key={index} 
              className="flex flex-col items-center text-center p-8 rounded-xl border bg-card hover:shadow-lg transition-shadow"
            >
              <div className="p-3 rounded-full bg-primary/10 mb-4">
                {type.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{type.name}</h3>
              <p className="text-muted-foreground text-sm">{type.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why Choose MindLens?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Stop juggling multiple tabs, documents, and notes. MindLens brings everything together 
                in one intelligent workspace that grows with your knowledge.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4 p-8">
                  <div className="aspect-square rounded-lg bg-background border shadow-sm flex items-center justify-center">
                    <Globe className="h-8 w-8 text-primary" />
                  </div>
                  <div className="aspect-square rounded-lg bg-background border shadow-sm flex items-center justify-center">
                    <Youtube className="h-8 w-8 text-primary" />
                  </div>
                  <div className="aspect-square rounded-lg bg-background border shadow-sm flex items-center justify-center">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div className="aspect-square rounded-lg bg-background border shadow-sm flex items-center justify-center">
                    <MessageSquare className="h-8 w-8 text-primary" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-12">
            <div className="flex justify-center mb-6">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center">
                    <Star className="w-4 h-4 text-primary" />
                  </div>
                ))}
              </div>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Knowledge Workflow?
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of researchers, students, and professionals who use MindLens 
              to unlock insights from their sources.
            </p>
            
            <Button 
              size="lg" 
              className="text-lg px-8 py-4 h-auto"
              onClick={handleGetStarted}
            >
              {user ? 'Continue to MindLens' : 'Start Your Journey'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
};

export default LandingPage;
