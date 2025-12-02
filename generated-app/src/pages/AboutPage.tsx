import {
  TreeDeciduous,
  Sparkles,
  Bug,
  Lightbulb,
  GitPullRequest,
  MessageSquare,
  Heart,
  Leaf,
  Target,
  Zap,
  Users,
  ArrowRight,
  ExternalLink,
  Code2,
  Palette,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AboutPage() {
  const features = [
    { icon: Target, title: 'Sprint Planning', desc: 'Organize work into focused sprints with clear goals' },
    { icon: Zap, title: 'Kanban Board', desc: 'Visualize workflow with drag-and-drop simplicity' },
    { icon: Users, title: 'Team Collaboration', desc: 'Assign tasks and track progress together' },
    { icon: Palette, title: 'Customizable', desc: 'Labels, components, and project settings your way' },
  ];

  const requestMethods = [
    {
      icon: Bug,
      title: 'Bug Reports',
      description: 'Found something broken? Help us squash it!',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      steps: ['Describe what happened', 'Include steps to reproduce', 'Add screenshots if possible'],
    },
    {
      icon: Lightbulb,
      title: 'Feature Requests',
      description: 'Have an idea? We\'d love to hear it!',
      color: 'text-[#E9C46A]',
      bgColor: 'bg-[#E9C46A]/10',
      steps: ['Explain the feature', 'Share the use case', 'Describe expected behavior'],
    },
    {
      icon: GitPullRequest,
      title: 'Pull Requests',
      description: 'Code contributions are always welcome!',
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
      steps: ['Fork the repository', 'Make your changes', 'Submit a PR with description'],
    },
  ];

  return (
    <div className="min-h-full bg-background">
      {/* Hero Section with animated gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-secondary to-accent py-16 px-6">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-4 -left-4 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse" />
          <div className="absolute top-1/2 -right-8 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute -bottom-8 left-1/3 w-40 h-40 bg-white/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
          {/* Floating leaves */}
          <Leaf className="absolute top-8 right-1/4 w-8 h-8 text-white/20 animate-bounce" style={{ animationDuration: '3s' }} />
          <Leaf className="absolute bottom-12 left-1/4 w-6 h-6 text-white/15 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }} />
          <Leaf className="absolute top-1/3 left-12 w-5 h-5 text-white/10 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }} />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-3 mb-6 animate-fade-in">
            <div className="relative">
              <TreeDeciduous className="w-16 h-16 text-white" strokeWidth={1.5} />
              <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-accent animate-pulse" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Welcome to Canopy
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            A JIRA-like project management tool that helps teams plan, track, and deliver great work together.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12 stagger-children">
        {/* Mission Statement */}
        <section className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
            <Heart className="w-4 h-4" />
            Our Mission
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Simplify Project Management
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            Canopy was born from the belief that project management should be intuitive, beautiful, and accessible.
            We've combined the power of professional tools with a delightful user experience.
          </p>
        </section>

        {/* Features Grid */}
        <section className="mb-16">
          <h3 className="text-xl font-semibold text-foreground mb-6 text-center" style={{ fontFamily: 'var(--font-display)' }}>
            What Makes Canopy Special
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-5 bg-card rounded-xl border border-border hover:border-accent/50 hover:shadow-lg transition-all duration-300 hover-lift"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-lg bg-accent/15 flex items-center justify-center mb-4 group-hover:bg-accent/25 transition-colors">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <h4 className="font-semibold text-foreground mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                  {feature.title}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-16">
          <div className="flex-1 h-px bg-border" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <Leaf className="w-4 h-4" />
            <span className="text-sm font-medium">Get Involved</span>
            <Leaf className="w-4 h-4" />
          </div>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* How to Request Features/Report Bugs */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 rounded-full text-secondary text-sm font-medium mb-4">
              <MessageSquare className="w-4 h-4" />
              Contribute
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              How to Make Requests
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We value your feedback! Here are the best ways to report bugs or request new features.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {requestMethods.map((method, index) => (
              <div
                key={method.title}
                className="relative group bg-card rounded-2xl border border-border overflow-hidden hover:border-accent/50 transition-all duration-300 hover-lift"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Card Header */}
                <div className={`${method.bgColor} p-6 pb-8`}>
                  <div className={`w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center mb-4`}>
                    <method.icon className={`w-7 h-7 ${method.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                    {method.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {method.description}
                  </p>
                </div>

                {/* Card Body */}
                <div className="p-6 pt-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Steps to follow
                  </h4>
                  <ul className="space-y-2">
                    {method.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground mt-0.5">
                          {stepIndex + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Best Practices */}
        <section className="mb-16">
          <div className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 rounded-2xl p-8 border border-border">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-foreground mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                  Best Practices for Great Feedback
                </h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    'Be specific and descriptive',
                    'Include browser/device info for bugs',
                    'Search existing issues first',
                    'One issue per report',
                    'Use clear, concise titles',
                    'Attach relevant screenshots',
                  ].map((practice, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ArrowRight className="w-4 h-4 text-accent flex-shrink-0" />
                      {practice}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <div className="bg-card rounded-2xl border border-border p-8 md:p-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/15 mb-6">
              <Code2 className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Ready to Get Started?
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-6">
              Create your first project and experience the joy of organized,
              beautiful project management with Canopy.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 px-6"
                onClick={() => window.location.href = '/projects/new'}
              >
                Create a Project
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => window.location.href = '/projects'}
              >
                View All Projects
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
            <TreeDeciduous className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Canopy</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built with <Heart className="w-3 h-3 inline-block text-secondary mx-1" /> for teams who love beautiful tools
          </p>
        </footer>
      </div>
    </div>
  );
}
