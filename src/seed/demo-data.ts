import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
import path from "path";
import { ObjectId } from "mongodb";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { auth } from "../lib/auth";

async function seed() {
  try {
    if (!process.env.MONGO_URI) {
      console.error("MONGO_URI not defined");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db!;
    console.log("Connected to:", db.databaseName);

    const userCol = db.collection("user");

    let employer = await userCol.findOne({ email: "employer@jobpilot.ai" });
    if (!employer) {
      const result = await auth.api.signUpEmail({
        body: {
          email: "employer@jobpilot.ai",
          password: "Employer@12345",
          name: "TechCorp Bangladesh",
        },
      });

      await db.collection("user").updateOne(
        { _id: new ObjectId(result.user.id) },
        { $set: { role: "employer", companyName: "TechCorp Bangladesh" } }
      );
      employer = await userCol.findOne({ _id: new ObjectId(result.user.id) });
      console.log("Created employer: employer@jobpilot.ai / Employer@12345");
    } else {
      console.log("Employer exists");
    }

    let candidate = await userCol.findOne({ email: "demo@jobpilot.ai" });
    if (!candidate) {
      console.log("WARNING: Run npm run seed first");
      process.exit(1);
    }

    const jobCol = db.collection("jobs");
    await jobCol.deleteMany({});

    const jobs = [
      {
        title: "Senior Full-Stack Developer",
        shortDescription: "Build scalable web applications using React and Node.js with a passionate engineering team.",
        fullDescription: "We are looking for a Senior Full-Stack Developer to join our growing engineering team. You will work on building and maintaining our core web platform that serves millions of users.\n\nResponsibilities:\n- Design and implement new features using React.js and Node.js\n- Write clean, maintainable, and well-tested code\n- Participate in code reviews and mentor junior developers\n- Collaborate with product managers and designers\n- Optimize application performance and scalability\n\nRequirements:\n- 5+ years of experience in full-stack development\n- Strong proficiency in React.js, TypeScript, Node.js\n- Experience with MongoDB and PostgreSQL\n- Familiarity with AWS or GCP cloud services\n- Excellent problem-solving skills",
        category: "Engineering",
        location: "Dhaka, Bangladesh",
        salary: "৳80,000 - ৳150,000",
        jobType: "full-time",
        postedBy: employer!._id,
        deadline: new Date("2026-08-30"),
        isFeatured: true,
        status: "approved",
        companyLogo: "",
      },
      {
        title: "React Frontend Developer",
        shortDescription: "Create beautiful, responsive user interfaces for our SaaS products.",
        fullDescription: "Join our frontend team to build stunning user interfaces that delight our customers.\n\nResponsibilities:\n- Develop responsive web applications using React.js\n- Implement UI/UX designs with pixel-perfect accuracy\n- Write reusable component libraries\n- Ensure cross-browser compatibility\n- Improve frontend performance\n\nRequirements:\n- 3+ years of React.js experience\n- Strong CSS/HTML/Tailwind skills\n- Experience with state management (Redux, Zustand)\n- Understanding of RESTful APIs",
        category: "Engineering",
        location: "Remote",
        salary: "৳60,000 - ৳120,000",
        jobType: "remote",
        postedBy: employer!._id,
        deadline: new Date("2026-08-15"),
        isFeatured: false,
        status: "approved",
        companyLogo: "",
      },
      {
        title: "UI/UX Designer",
        shortDescription: "Design intuitive and beautiful user experiences for mobile and web applications.",
        fullDescription: "We need a talented UI/UX Designer to create amazing user experiences across our products.\n\nResponsibilities:\n- Create wireframes, prototypes, and high-fidelity designs\n- Conduct user research and usability testing\n- Design responsive web and mobile interfaces\n- Create and maintain design system\n- Collaborate closely with developers\n\nRequirements:\n- 3+ years of UI/UX design experience\n- Proficiency in Figma and Adobe Creative Suite\n- Strong portfolio demonstrating design skills\n- Understanding of design principles and accessibility",
        category: "Design",
        location: "Gulshan, Dhaka",
        salary: "৳50,000 - ৳90,000",
        jobType: "full-time",
        postedBy: employer!._id,
        deadline: new Date("2026-09-01"),
        isFeatured: true,
        status: "approved",
        companyLogo: "",
      },
      {
        title: "Digital Marketing Manager",
        shortDescription: "Lead our marketing efforts and drive growth through digital channels.",
        fullDescription: "Looking for an experienced Digital Marketing Manager to lead our marketing strategy.\n\nResponsibilities:\n- Develop and execute digital marketing campaigns\n- Manage SEO, SEM, social media marketing\n- Analyze campaign performance and optimize ROI\n- Manage marketing budget\n- Lead a team of 3 marketing specialists\n\nRequirements:\n- 4+ years of digital marketing experience\n- Proven track record of campaign management\n- Experience with Google Ads, Facebook Ads\n- Strong analytical skills",
        category: "Marketing",
        location: "Banani, Dhaka",
        salary: "৳70,000 - ৳130,000",
        jobType: "full-time",
        postedBy: employer!._id,
        deadline: new Date("2026-08-20"),
        isFeatured: false,
        status: "approved",
        companyLogo: "",
      },
      {
        title: "DevOps Engineer",
        shortDescription: "Manage cloud infrastructure and CI/CD pipelines for high-availability systems.",
        fullDescription: "We need a skilled DevOps Engineer to manage and improve our cloud infrastructure.\n\nResponsibilities:\n- Manage AWS/GCP cloud infrastructure\n- Build and maintain CI/CD pipelines\n- Monitor system performance and uptime\n- Implement security best practices\n- Automate deployment and scaling processes\n\nRequirements:\n- 3+ years of DevOps experience\n- Strong knowledge of Docker, Kubernetes\n- Experience with Terraform or similar IaC tools\n- AWS/GCP certification preferred",
        category: "Engineering",
        location: "Remote",
        salary: "৳90,000 - ৳160,000",
        jobType: "remote",
        postedBy: employer!._id,
        deadline: new Date("2026-09-15"),
        isFeatured: false,
        status: "approved",
        companyLogo: "",
      },
      {
        title: "Data Analyst Intern",
        shortDescription: "Learn data analytics while working on real business projects.",
        fullDescription: "Great opportunity for students or fresh graduates to start their career in data analytics.\n\nResponsibilities:\n- Assist in data collection and cleaning\n- Create reports and dashboards\n- Support the analytics team with ad-hoc analysis\n- Learn SQL, Python, and visualization tools\n\nRequirements:\n- Currently studying or recently graduated\n- Basic knowledge of Excel and statistics\n- Eagerness to learn SQL and Python\n- Available for 3-6 months",
        category: "Data Science",
        location: "Dhanmondi, Dhaka",
        salary: "৳15,000 - ৳25,000",
        jobType: "part-time",
        postedBy: employer!._id,
        deadline: new Date("2026-08-10"),
        isFeatured: false,
        status: "approved",
        companyLogo: "",
      },
      {
        title: "Product Manager",
        shortDescription: "Define product strategy and lead cross-functional teams to deliver impactful features.",
        fullDescription: "We are seeking an experienced Product Manager to drive our product vision and execution.\n\nResponsibilities:\n- Define product roadmap and strategy\n- Work with engineering, design, and business teams\n- Gather and prioritize user requirements\n- Track product metrics and KPIs\n\nRequirements:\n- 5+ years of product management experience\n- Technical background preferred\n- Strong analytical and communication skills\n- Experience with agile methodologies",
        category: "Product",
        location: "Gulshan, Dhaka",
        salary: "৳100,000 - ৳180,000",
        jobType: "full-time",
        postedBy: employer!._id,
        deadline: new Date("2026-08-25"),
        isFeatured: true,
        status: "approved",
        companyLogo: "",
      },
      {
        title: "Content Writer (Part-Time)",
        shortDescription: "Write engaging blog posts and marketing content for a tech startup.",
        fullDescription: "We need a creative content writer to produce high-quality articles and marketing copy.\n\nResponsibilities:\n- Write blog posts about technology and career topics\n- Create email marketing content\n- Develop social media copy\n- Research industry trends\n- Optimize content for SEO\n\nRequirements:\n- 1+ years of content writing experience\n- Excellent English writing skills\n- Basic understanding of SEO\n- Ability to meet deadlines",
        category: "Marketing",
        location: "Remote",
        salary: "৳20,000 - ৳40,000",
        jobType: "part-time",
        postedBy: employer!._id,
        deadline: new Date("2026-08-05"),
        isFeatured: false,
        status: "approved",
        companyLogo: "",
      },
    ];

    const insertedJobs = await jobCol.insertMany(jobs);
    const jobIds = Object.values(insertedJobs.insertedIds);
    console.log(`Created ${jobIds.length} jobs`);

    await userCol.updateOne(
      { _id: employer!._id },
      { $set: { jobPostCount: jobIds.length } }
    );

    const appCol = db.collection("applications");
    await appCol.deleteMany({});
    const applications = [
      { job: jobIds[0], candidate: candidate!._id, coverLetter: "I am very interested in this Senior Full-Stack Developer position.", status: "pending", createdAt: new Date(), updatedAt: new Date() },
      { job: jobIds[1], candidate: candidate!._id, coverLetter: "I would love to join your frontend team.", status: "reviewed", createdAt: new Date(), updatedAt: new Date() },
      { job: jobIds[2], candidate: candidate!._id, coverLetter: "As a UI/UX designer, I am excited about this opportunity.", status: "accepted", createdAt: new Date(), updatedAt: new Date() },
      { job: jobIds[4], candidate: candidate!._id, coverLetter: "I have experience managing AWS infrastructure.", status: "pending", createdAt: new Date(), updatedAt: new Date() },
    ];
    await appCol.insertMany(applications);
    console.log(`Created ${applications.length} applications`);

    const intCol = db.collection("interactions");
    await intCol.deleteMany({});
    const interactions = [
      { user: candidate!._id, job: jobIds[0], type: "view", createdAt: new Date(), updatedAt: new Date() },
      { user: candidate!._id, job: jobIds[1], type: "view", createdAt: new Date(), updatedAt: new Date() },
      { user: candidate!._id, job: jobIds[2], type: "save", createdAt: new Date(), updatedAt: new Date() },
      { user: candidate!._id, job: jobIds[3], type: "view", createdAt: new Date(), updatedAt: new Date() },
      { user: candidate!._id, job: jobIds[4], type: "save", createdAt: new Date(), updatedAt: new Date() },
      { user: candidate!._id, job: jobIds[5], type: "view", createdAt: new Date(), updatedAt: new Date() },
      { user: candidate!._id, job: jobIds[6], type: "apply", createdAt: new Date(), updatedAt: new Date() },
    ];
    await intCol.insertMany(interactions);
    console.log(`Created ${interactions.length} interactions`);

    const revCol = db.collection("reviews");
    await revCol.deleteMany({});
    const reviews = [
      { job: jobIds[0], candidate: candidate!._id, employer: employer!._id, rating: 5, comment: "Great company to work with! Very responsive hiring process.", createdAt: new Date(), updatedAt: new Date() },
      { job: jobIds[1], candidate: candidate!._id, employer: employer!._id, rating: 4, comment: "Good experience. The team is supportive and collaborative.", createdAt: new Date(), updatedAt: new Date() },
      { job: jobIds[2], candidate: candidate!._id, employer: employer!._id, rating: 5, comment: "Amazing design team! They value creativity and innovation.", createdAt: new Date(), updatedAt: new Date() },
    ];
    await revCol.insertMany(reviews);
    console.log(`Created ${reviews.length} reviews`);

    const recCol = db.collection("recommendations");
    await recCol.deleteMany({});
    const recommendations = [
      { user: candidate!._id, job: jobIds[0], score: 92, reason: "Strong match: Your skills in React and Node.js align perfectly.", createdAt: new Date(), updatedAt: new Date() },
      { user: candidate!._id, job: jobIds[1], score: 85, reason: "Good match: Your frontend experience makes you a strong candidate.", createdAt: new Date(), updatedAt: new Date() },
      { user: candidate!._id, job: jobIds[2], score: 78, reason: "Moderate match: Your creative skills are relevant for this role.", createdAt: new Date(), updatedAt: new Date() },
      { user: candidate!._id, job: jobIds[4], score: 70, reason: "Moderate match: Some DevOps experience required.", createdAt: new Date(), updatedAt: new Date() },
    ];
    await recCol.insertMany(recommendations);
    console.log(`Created ${recommendations.length} recommendations`);

    const clCol = db.collection("coverletters");
    await clCol.deleteMany({});
    const coverLetters = [
      { user: candidate!._id, job: jobIds[0], tone: "formal", length: "medium", content: "Dear Hiring Manager,\n\nI am writing to express my strong interest in the Senior Full-Stack Developer position at TechCorp Bangladesh. With over 6 years of experience building scalable web applications using React and Node.js, I am confident in my ability to contribute meaningfully to your engineering team.\n\nBest regards,\nDemo Candidate", jobTitle: "Senior Full-Stack Developer", companyName: "TechCorp Bangladesh", createdAt: new Date(), updatedAt: new Date() },
    ];
    await clCol.insertMany(coverLetters);
    console.log(`Created ${coverLetters.length} cover letters`);

    console.log("\n=== ALL DEMO DATA SEEDED ===");
    console.log("Employer: employer@jobpilot.ai / Employer@12345");
    console.log("Jobs: 8 | Applications: 4 | Reviews: 3 | Recommendations: 4");
    process.exit(0);
  } catch (error: any) {
    console.error("Seed error:", error.message || error);
    process.exit(1);
  }
}

seed();
