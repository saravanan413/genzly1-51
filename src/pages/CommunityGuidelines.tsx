
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { ScrollArea } from '@/components/ui/scroll-area';

const CommunityGuidelines = () => {
  const guidelines = [
    {
      title: "Safety",
      description: "We want everyone to feel safe when they come to Genzly. We don't allow content that glorifies violence or makes threats against people, animals, or institutions. Content that promotes or encourages dangerous organizations, self-harm, or bullying has no place on our platform. We're committed to removing content and accounts that don't follow these guidelines."
    },
    {
      title: "Respect", 
      description: "Genzly should be a place where people can express themselves and connect with others in a respectful environment. We don't allow hate speech, harassment, sexual exploitation, or discrimination of any kind. Everyone deserves to be treated with dignity and respect, regardless of their background, beliefs, or identity."
    },
    {
      title: "Authenticity",
      description: "We want Genzly to continue to be an authentic place for real people to share real experiences. Help us foster this community by posting content that's genuine and that represents who you really are. We don't allow spam, scams, impersonation, or misleading information that could deceive or harm our community."
    },
    {
      title: "Intellectual Property",
      description: "Respect other people's rights, including copyright and trademark. Generally, if you didn't create it, don't post it unless you have permission. We respond to clear reports of alleged copyright and trademark infringement. Learn more about our intellectual property policies and how to report content you think infringes your rights."
    },
    {
      title: "Appropriate Content",
      description: "People of many ages and backgrounds use Genzly, so we ask that you keep content appropriate for a diverse audience. We don't allow nudity, sexual activity, or graphic violence, except in limited cases for awareness, education, or artistic purposes. Content should be suitable for our global community."
    },
    {
      title: "Integrity of the Platform",
      description: "Help us maintain the integrity of the platform by using it as intended. Don't try to manipulate our systems, create fake engagement, or misuse our features. This includes creating fake accounts, buying followers or likes, or using automation tools that violate our terms. Authentic engagement helps create a better experience for everyone."
    },
    {
      title: "Reporting & Enforcement",
      description: "If you see something that doesn't follow our guidelines, please report it to us. We review each report and take appropriate action, which may include removing content, issuing warnings, or disabling accounts. Repeated violations of our Community Guidelines may result in the suspension or permanent removal of your account. We're committed to keeping our community safe and welcoming for everyone."
    }
  ];

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <div className="container mx-auto max-w-2xl">
          {/* Header */}
          <div className="flex items-center space-x-4 mb-6">
            <Link to="/settings" className="hover:bg-muted rounded-full p-1 transition-colors">
              <ArrowLeft size={24} className="text-foreground" />
            </Link>
            <h1 className="text-xl font-semibold text-foreground">Community Guidelines</h1>
          </div>

          {/* Introduction */}
          <div className="bg-card rounded-lg border p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3 text-foreground">Welcome to Genzly</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Community Guidelines help create a safe, welcoming environment for everyone. 
              These guidelines apply to all content shared on Genzly, including posts, stories, 
              comments, and messages. By using our platform, you agree to follow these standards.
            </p>
          </div>

          {/* Guidelines */}
          <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="space-y-4 pr-4">
              {guidelines.map((guideline, index) => (
                <div key={index} className="bg-card rounded-lg border p-6">
                  <h3 className="text-lg font-semibold mb-3 text-foreground flex items-center">
                    <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                      {index + 1}
                    </span>
                    {guideline.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {guideline.description}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="bg-card rounded-lg border p-6 mt-6">
            <p className="text-sm text-muted-foreground text-center">
              These guidelines may be updated from time to time. 
              For questions about our Community Guidelines, please contact our support team.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CommunityGuidelines;
