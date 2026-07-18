import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/jobPilotAI";

const articles = [
  {
    title: "10 Resume Mistakes That Are Costing You Interviews",
    slug: "resume-mistakes-costing-interviews",
    excerpt: "Avoid these common resume errors that hiring managers see every day and learn how to fix them for better results.",
    category: "Resume Tips",
    author: "Sarah Mitchell",
    readTime: "6 min read",
    image: "",
    published: true,
    content: `<p>Your resume is your first impression with potential employers. Even small mistakes can send it straight to the rejection pile. Here are 10 common resume mistakes and how to fix them.</p>

<h2>1. Spelling and Grammar Errors</h2>
<p>Nothing kills a resume faster than typos. Recruiters spend an average of 6 seconds scanning a resume, and spelling mistakes signal carelessness. Always proofread your resume multiple times, use spell-check tools, and have a friend review it before submitting.</p>

<h2>2. Using an Unprofessional Email Address</h2>
<p>Email addresses like "partyanimal99@email.com" do not belong on a resume. Create a professional email with your name (e.g., firstname.lastname@email.com). This small detail matters more than you think.</p>

<h2>3. Including Irrelevant Work Experience</h2>
<p>Your resume should be tailored to the job you are applying for. If you are applying for a marketing role, your summer job as a restaurant server from 2015 is probably not relevant. Focus on experience that demonstrates skills applicable to the target position.</p>

<h2>4. Making It Too Long</h2>
<p>For most professionals, a one-page resume is ideal. Hiring managers do not need to see every job you have ever held. If you have more than 10 years of experience, two pages may be acceptable, but every line should earn its place.</p>

<h2>5. Using Passive Voice</h2>
<p>Weak language like "was responsible for managing a team" falls flat. Strong action verbs like "Led a team of 12" or "Increased revenue by 35%" make a much stronger impact. Start each bullet point with a powerful action verb.</p>

<h2>6. Not Including Quantifiable Results</h2>
<p>Numbers speak louder than words. Instead of saying "Improved sales performance," say "Increased quarterly sales by 28% through targeted campaign strategies." Quantifiable achievements give hiring managers concrete evidence of your capabilities.</p>

<h2>7. Using a Generic Objective Statement</h2>
<p>Objective statements are outdated. Replace them with a compelling professional summary that highlights your key qualifications and what you bring to the employer. Focus on their needs, not yours.</p>

<h2>8. Poor Formatting and Design</h2>
<p>Inconsistent fonts, uneven spacing, and cluttered layouts make your resume hard to read. Use clean, modern formatting with clear section headers, consistent bullet points, and plenty of white space. Stick to one or two professional fonts.</p>

<h2>9. Not Including Keywords from the Job Description</h2>
<p>Many companies use Applicant Tracking Systems (ATS) that scan for keywords. If your resume does not contain the right terms, it may never reach human eyes. Study the job description and incorporate relevant keywords naturally.</p>

<h2>10. Including References on Your Resume</h2>
<p>The phrase "References available upon request" is unnecessary and wastes valuable space. Employers will ask for references when they need them. Use that space to highlight more of your achievements instead.</p>

<h2>Final Thoughts</h2>
<p>A polished, targeted resume significantly improves your chances of landing interviews. Take the time to review and refine your resume for each application, and you will see better results in your job search.</p>`,
  },
  {
    title: "How to Ace Your Remote Job Interview in 2026",
    slug: "ace-remote-job-interview-2026",
    excerpt: "Master the art of virtual interviews with these proven strategies for video calls, technical setup, and making a great impression.",
    category: "Interview Prep",
    author: "James Cooper",
    readTime: "7 min read",
    image: "",
    published: true,
    content: `<p>Remote work has become the norm, and so have virtual interviews. Here is how to make sure you shine in your next video interview.</p>

<h2>Test Your Technology Beforehand</h2>
<p>Technical difficulties during an interview are a red flag for employers. Test your internet connection, camera, microphone, and lighting at least 24 hours before the interview. Have a backup plan ready in case your primary setup fails, such as a mobile hotspot or a phone number you can call in.</p>

<h2>Create a Professional Background</h2>
<p>Your background says a lot about you. Choose a clean, well-lit, and distraction-free space. A plain wall or a tidy bookshelf works well. Avoid virtual backgrounds if possible, as they can look unprofessional and cause video glitches. If your space is not ideal, invest in a simple backdrop.</p>

<h2>Dress Professionally, Even from Home</h2>
<p>Just because you are at home does not mean you should dress casually. Dress as you would for an in-person interview, at least from the waist up. This helps you get into a professional mindset and signals respect for the opportunity.</p>

<h2>Master the Art of Eye Contact</h2>
<p>Looking directly at the camera, not the screen, creates the impression of eye contact with the interviewer. Position your camera at eye level and look into the lens when speaking. This small adjustment makes a significant difference in building rapport.</p>

<h2>Prepare Your Stories Using the STAR Method</h2>
<p>Behavioral questions are common in remote interviews. Prepare stories using the STAR method (Situation, Task, Action, Result) that demonstrate your skills, problem-solving abilities, and experience working independently. Remote employers value self-motivation and accountability.</p>

<h2>Showcase Your Remote Work Skills</h2>
<p>Highlight your experience with remote collaboration tools like Slack, Zoom, Trello, or Asana. Mention your home office setup and how you manage your time and stay productive without direct supervision. Give specific examples of successful remote projects you have completed.</p>

<h2>Minimize Distractions</h2>
<p>Inform everyone in your household about your interview time. Silence your phone, close unnecessary browser tabs, and turn off desktop notifications. If you have pets, make sure they are in another room. Even a single interruption can derail your focus.</p>

<h2>Have Questions Ready</h2>
<p>Asking thoughtful questions shows genuine interest and preparation. Ask about the team's communication style, how success is measured in the role, the onboarding process, and the company culture for remote employees. This demonstrates that you are thinking seriously about the position.</p>

<h2>Follow Up Promptly</h2>
<p>Send a thank-you email within 24 hours of the interview. Reference specific topics you discussed to show you were engaged and attentive. Reiterate your interest in the role and mention how your skills align with their needs.</p>

<h2>Practice Makes Perfect</h2>
<p>Do a mock interview with a friend or record yourself answering common questions. Review the recording to check your body language, tone of voice, and how clearly you communicate. The more you practice, the more natural and confident you will appear.</p>`,
  },
  {
    title: "Negotiating Your Salary: A Complete Guide for 2026",
    slug: "salary-negotiation-guide-2026",
    excerpt: "Learn how to research market rates, time your negotiation perfectly, and negotiate compensation packages with confidence.",
    category: "Career Growth",
    author: "Emily Chen",
    readTime: "8 min read",
    image: "",
    published: true,
    content: `<p>Many professionals leave thousands of dollars on the table by not negotiating their salary. Here is a comprehensive guide to negotiating your compensation like a pro.</p>

<h2>Research Market Rates Thoroughly</h2>
<p>Before entering any negotiation, you need data. Use resources like Glassdoor, LinkedIn Salary, PayScale, and industry-specific salary surveys to understand what professionals in your role, experience level, and geographic area earn. Consider factors like company size, industry, and the specific skills required. Knowledge is your strongest leverage.</p>

<h2>Know Your Worth Beyond the Base Salary</h2>
<p>Compensation is more than just a paycheck. Consider the total package: health insurance, retirement contributions, stock options, bonuses, paid time off, professional development budgets, flexible work arrangements, and commuter benefits. Sometimes a lower base salary with excellent benefits is worth more overall.</p>

<h2>Time Your Negotiation Strategically</h2>
<p>The best time to negotiate is after you have received a written offer but before you have signed it. At this point, the employer has invested time in the hiring process and is committed to bringing you on board. Never bring up salary before they do, and let them make the first offer if possible.</p>

<h2>Practice Your Pitch</h2>
<p>Rehearse your negotiation talking points with a friend or mentor. Focus on articulating your value proposition clearly and confidently. Use specific examples of your accomplishments and how they translate to benefits for the employer. Practice handling objections gracefully.</p>

<h2>Use the Power of Silence</h2>
<p>After stating your desired salary, resist the urge to fill the silence. Give the employer time to process and respond. Talking too much after making your request can weaken your position. A confident pause shows that you are comfortable with your ask.</p>

<h2>Negotiate the Entire Package</h2>
<p>If the employer cannot meet your salary expectations, explore other areas of the compensation package that might have more flexibility. You might negotiate additional vacation days, a signing bonus, a performance review timeline, remote work flexibility, professional development funds, or a better job title.</p>

<h2>Get Everything in Writing</h2>
<p>Once you have reached an agreement, request a revised offer letter that reflects all the terms you have negotiated. Verbal promises are not binding. Having everything documented protects both you and the employer and ensures there are no misunderstandings.</p>

<h2>Handle Counteroffers with Care</h2>
<p>If the employer counters with a lower number than you requested, evaluate it against your research and your minimum acceptable salary. You can make one more modest counteroffer or accept if it falls within your acceptable range. Know your walk-away point before negotiations begin.</p>

<h2>Be Professional and Gracious</h2>
<p>Regardless of the outcome, maintain a professional and positive tone throughout the negotiation. Employers remember candidates who are reasonable and easy to work with. Even if you do not get everything you wanted, preserving the relationship matters for your long-term career.</p>

<h2>When to Walk Away</h2>
<p>Know your minimum acceptable compensation before negotiations start. If the employer cannot meet that minimum and shows no flexibility, it may be best to decline respectfully. Accepting a position that undervalues you can lead to resentment and disengagement down the road.</p>`,
  },
  {
    title: "Building a Personal Brand That Attracts Employers",
    slug: "personal-brand-attracts-employers",
    excerpt: "Discover how to build a compelling online presence that makes recruiters come to you instead of the other way around.",
    category: "Career Growth",
    author: "David Park",
    readTime: "6 min read",
    image: "",
    published: true,
    content: `<p>In today's competitive job market, having a strong personal brand can set you apart from thousands of other candidates. Here is how to build one that gets you noticed.</p>

<h2>Define Your Unique Value Proposition</h2>
<p>Ask yourself what makes you different from others in your field. What specific skills, experiences, or perspectives do you bring that others do not? Your value proposition should be clear, concise, and authentic. It becomes the foundation of everything you share online.</p>

<h2>Optimize Your LinkedIn Profile</h2>
<p>LinkedIn is your digital resume and networking hub. Use a professional headshot, write a compelling headline that goes beyond your job title, and craft a summary that tells your professional story. Include relevant keywords so recruiters can find you. Actively engage with content in your industry.</p>

<h2>Create Valuable Content</h2>
<p>Share insights, write articles, or create posts about topics in your area of expertise. This demonstrates your knowledge and positions you as a thought leader. You do not need to become a full-time content creator. Even one thoughtful LinkedIn post per week can make a significant impact over time.</p>

<h2>Build a Portfolio Website</h2>
<p>A personal website gives you complete control over your professional narrative. Showcase your best work, share case studies, include testimonials, and write about your professional journey. Keep the design clean and modern, and make sure your contact information is easy to find.</p>

<h2>Network Authentically</h2>
<p>Building a personal brand is not about self-promotion. It is about building genuine relationships. Engage with others' content, offer help before asking for it, attend industry events, and participate in professional communities. The strongest networks are built on mutual support.</p>

<h2>Be Consistent Across Platforms</h2>
<p>Your messaging, visual identity, and tone should be consistent whether someone finds you on LinkedIn, your personal website, Twitter, or a conference stage. Consistency builds recognition and trust. Use the same professional photo, bio, and color scheme across platforms.</p>

<h2>Collect and Showcase Testimonials</h2>
<p>Recommendations from colleagues, managers, and clients add credibility to your brand. Ask for LinkedIn recommendations from people you have worked closely with. Feature quotes and case studies on your website. Third-party validation is far more powerful than self-promotion.</p>

<h2>Stay Active and Current</h2>
<p>A stale online presence sends the wrong message. Regularly update your profiles with new skills, certifications, and achievements. Share current industry news and trends. An active presence signals that you are engaged and passionate about your field.</p>

<h2>Measure and Adjust</h2>
<p>Track your online engagement and visibility. Notice what type of content resonates most with your audience. Pay attention to profile views, connection requests, and inbound messages. Use these insights to refine your approach and focus on what works.</p>`,
  },
  {
    title: "The Hidden Job Market: How to Find Unlisted Opportunities",
    slug: "hidden-job-market-unlisted-opportunities",
    excerpt: "Up to 80% of jobs are never publicly posted. Learn proven strategies to tap into the hidden job market and land your next role.",
    category: "Job Search",
    author: "Lisa Wang",
    readTime: "7 min read",
    image: "",
    published: true,
    content: `<p>It is widely estimated that 70-80% of job opportunities are never publicly advertised. Tapping into this hidden job market requires a different approach than simply browsing job boards.</p>

<h2>Understand Why Jobs Go Unlisted</h2>
<p>Companies often fill positions through internal referrals, promotions, or direct outreach before ever posting them publicly. Listing a job publicly is expensive and time-consuming, requiring HR resources to sort through hundreds of applications. Many employers prefer to hire through trusted networks first.</p>

<h2>Build Relationships Before You Need Them</h2>
<p>The best time to build your professional network is before you need a job. Attend industry events, join professional associations, participate in online communities, and connect with people in your field on LinkedIn. Genuine relationships take time to develop, so start building yours today.</p>

<h2>Leverage Informational Interviews</h2>
<p>Request brief 15-20 minute conversations with professionals in companies or roles you are interested in. Ask about their career path, what it is like to work at their company, and what skills are most valued. These conversations often lead to referrals for unlisted positions.</p>

<h2>Work with Recruiters and Headhunters</h2>
<p>Staffing agencies and executive recruiters often have access to positions that are not publicly advertised. Build relationships with recruiters who specialize in your industry. Keep your resume updated and be responsive when they reach out with opportunities.</p>

<h2>Target Companies Directly</h2>
<p>Identify companies you would love to work for and reach out directly, even if they have no listed openings. Send a thoughtful email to a hiring manager or department head expressing your interest and explaining how you could add value. Proactive candidates often create their own opportunities.</p>

<h2>Engage on Professional Social Media</h2>
<p>Follow companies you are interested in on LinkedIn, Twitter, and other platforms. Engage with their content by commenting thoughtfully and sharing their posts. This keeps you on their radar and demonstrates genuine interest in their work. Sometimes recruiters check engagement when looking for candidates.</p>

<h2>Volunteer and Freelance</h2>
<p>Volunteering for industry organizations or taking on freelance projects can lead to unexpected job opportunities. It allows you to demonstrate your skills, build your network, and get your foot in the door at companies you are interested in. Many full-time positions start as volunteer or freelance engagements.</p>

<h2>Join Professional Associations</h2>
<p>Industry associations often have exclusive job boards, networking events, and mentorship programs. Membership signals professionalism and gives you access to opportunities that are not available to the general public. Many associations also host annual conferences where you can make valuable connections.</p>

<h2>Stay Top of Mind</h2>
<p>When someone in your network hears about an unlisted opportunity, you want to be the first person they think of. Stay visible by regularly sharing valuable content, congratulating connections on their achievements, and maintaining warm relationships. A simple check-in message every few months goes a long way.</p>

<h2>The Power of Employee Referrals</h2>
<p>Employee referrals are the number one source of hires at most companies. Many organizations offer referral bonuses to employees who recommend successful candidates. If you know someone at a company you are interested in, ask them to refer you. A personal referral can fast-track your application past the initial screening process.</p>`,
  },
  {
    title: "Mastering In-Demand Tech Skills for 2026 and Beyond",
    slug: "in-demand-tech-skills-2026",
    excerpt: "Stay ahead of the curve with the most sought-after technology skills that employers are actively seeking in 2026.",
    category: "Skill Development",
    author: "Michael Torres",
    readTime: "9 min read",
    image: "",
    published: true,
    content: `<p>The technology landscape evolves rapidly, and staying current with in-demand skills is essential for career growth. Here are the tech skills that employers are most actively seeking in 2026.</p>

<h2>Artificial Intelligence and Machine Learning</h2>
<p>AI and ML continue to dominate the tech hiring landscape. Skills in natural language processing, computer vision, predictive modeling, and generative AI are in extremely high demand. Familiarity with frameworks like TensorFlow, PyTorch, and Hugging Face Transformers, along with an understanding of prompt engineering and fine-tuning large language models, will make you a highly competitive candidate.</p>

<h2>Cloud Computing and DevOps</h2>
<p>Cloud-native development is now the standard. Proficiency in AWS, Azure, or Google Cloud Platform is essential. Beyond basic cloud services, employers seek expertise in containerization with Docker and Kubernetes, infrastructure as code using Terraform or Pulumi, CI/CD pipeline design, and cloud security best practices. Multi-cloud and hybrid-cloud experience is particularly valuable.</p>

<h2>Cybersecurity</h2>
<p>With increasing cyber threats, security professionals are in critical demand. Skills in penetration testing, security auditing, incident response, zero-trust architecture, and compliance frameworks like SOC 2 and ISO 27001 are essential. Understanding both offensive and defensive security practices makes you a well-rounded candidate in this field.</p>

<h2>Data Engineering and Analytics</h2>
<p>Organizations are generating more data than ever and need skilled professionals to manage it. Proficiency in SQL, Python, Apache Spark, Kafka, and data warehousing solutions like Snowflake or BigQuery is highly sought after. Skills in data governance, ETL pipeline design, and real-time data processing are particularly valuable.</p>

<h2>Full-Stack Development</h2>
<p>Full-stack developers who can work across the entire application stack remain in strong demand. Modern full-stack skills include React or Vue.js for frontend, Node.js or Python for backend, GraphQL for API design, and experience with serverless architectures. Understanding both relational and NoSQL databases rounds out a strong full-stack profile.</p>

<h2>Blockchain and Web3</h2>
<p>Despite market fluctuations, blockchain technology continues to find practical applications in finance, supply chain, healthcare, and digital identity. Skills in Solidity development, smart contract auditing, decentralized application design, and token economics are valuable, especially in regulated industries exploring blockchain solutions.</p>

<h2>Edge Computing and IoT</h2>
<p>As IoT devices proliferate, edge computing skills are becoming increasingly important. Knowledge of edge computing frameworks, real-time data processing at the edge, IoT protocols like MQTT, and embedded systems programming opens doors to growing sectors like smart cities, autonomous vehicles, and industrial automation.</p>

<h2>How to Develop These Skills</h2>
<p>Online learning platforms offer courses from beginner to advanced levels. Build projects that demonstrate your skills practically, contribute to open-source projects, earn relevant certifications, and participate in hackathons. Focus on learning fundamentals deeply rather than chasing every new tool or framework superficially.</p>

<h2>The Importance of Soft Skills</h2>
<p>Technical skills alone are not enough. Employers increasingly value communication, problem-solving, teamwork, and adaptability. The ability to explain complex technical concepts to non-technical stakeholders, collaborate effectively in cross-functional teams, and adapt to rapidly changing requirements is what separates good engineers from great ones.</p>`,
  },
];

async function seedBlog() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected for blog seeding");

    const BlogPost = mongoose.model(
      "BlogPost",
      new mongoose.Schema(
        {
          title: { type: String, required: true },
          slug: { type: String, required: true, unique: true },
          excerpt: { type: String, required: true },
          content: { type: String, required: true },
          category: { type: String, required: true },
          author: { type: String, default: "JobPilot Team" },
          readTime: { type: String, default: "5 min read" },
          image: { type: String, default: "" },
          published: { type: Boolean, default: true },
        },
        { timestamps: true }
      )
    );

    await BlogPost.deleteMany({});
    console.log("Cleared existing blog posts");

    await BlogPost.insertMany(articles);
    console.log(`Seeded ${articles.length} blog articles`);

    await mongoose.disconnect();
    console.log("Done!");
  } catch (error: any) {
    console.error("Blog seed error:", error.message);
    process.exit(1);
  }
}

seedBlog();
