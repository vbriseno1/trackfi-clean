/**
 * Profession catalog used by onboarding, shift logging, and pay multipliers.
 * Each entry defines a category (icon + label), subs (specific roles),
 * shiftTypes (multiplier map for premium pay), and copy hints.
 */
export const PROFESSIONS = [
  { id:"healthcare", icon:"🏥", label:"Healthcare",
    subs:[{id:"nurse_rn",label:"RN"},{id:"nurse_np",label:"NP"},{id:"nurse_travel",label:"Travel Nurse"},
          {id:"doctor_md",label:"MD/DO"},{id:"pa",label:"PA"},{id:"crna",label:"CRNA"},
          {id:"paramedic",label:"Paramedic/EMT"},{id:"cna",label:"CNA"},{id:"rt",label:"Resp. Therapist"},
          {id:"pt",label:"PT/OT"},{id:"pharmacy",label:"Pharmacist"},{id:"health_admin",label:"Healthcare Admin"}],
    shiftTypes:{Regular:1,Overtime:1.5,"Double Time":2,Night:1.15,Weekend:1.25,Holiday:2},
    shiftLabel:"Shift", incomeLabel:"Healthcare Salary", notePlaceholder:"Unit, floor, specialty..." },
  { id:"education", icon:"📚", label:"Education",
    subs:[{id:"teacher_k12",label:"K-12 Teacher"},{id:"professor",label:"Professor"},
          {id:"admin_edu",label:"Administrator"},{id:"counselor_edu",label:"Counselor"},
          {id:"sub",label:"Substitute"},{id:"tutor",label:"Tutor"}],
    shiftTypes:{Regular:1,Substitute:1,"After School":1.25,"Summer":1},
    shiftLabel:"Day", incomeLabel:"Teaching Salary", notePlaceholder:"Grade, subject..." },
  { id:"trades", icon:"🔧", label:"Trades & Construction",
    subs:[{id:"electrician",label:"Electrician"},{id:"plumber",label:"Plumber"},
          {id:"carpenter",label:"Carpenter"},{id:"hvac",label:"HVAC"},{id:"welder",label:"Welder"},
          {id:"mechanic",label:"Mechanic"},{id:"contractor",label:"Contractor"}],
    shiftTypes:{Regular:1,Overtime:1.5,Weekend:1.25,Rush:2,Holiday:2},
    shiftLabel:"Job", incomeLabel:"Hourly/Contract Rate", notePlaceholder:"Client, project..." },
  { id:"tech", icon:"💻", label:"Technology",
    subs:[{id:"swe",label:"Software Engineer"},{id:"devops",label:"DevOps"},{id:"data",label:"Data Scientist"},
          {id:"pm",label:"Product Manager"},{id:"design",label:"Designer"},{id:"it",label:"IT Support"}],
    shiftTypes:{Regular:1,Overtime:1.5,"On-Call":1.5,Weekend:1.25},
    shiftLabel:"Session", incomeLabel:"Salary/Rate", notePlaceholder:"Sprint, project..." },
  { id:"transportation", icon:"🚗", label:"Transportation",
    subs:[{id:"rideshare",label:"Rideshare (Uber/Lyft)"},{id:"delivery",label:"Delivery Driver"},
          {id:"trucker",label:"Truck Driver (CDL)"},{id:"bus",label:"Bus/Transit Driver"}],
    shiftTypes:{Regular:1,Overtime:1.5,"Peak":1.25,Night:1.15,Holiday:2},
    shiftLabel:"Shift", incomeLabel:"Hourly/Per Mile", notePlaceholder:"Zone, route..." },
  { id:"retail_service", icon:"🛍️", label:"Retail & Service",
    subs:[{id:"retail",label:"Retail Associate"},{id:"retail_mgr",label:"Retail Manager"},
          {id:"server",label:"Server/Bartender"},{id:"cook",label:"Cook/Chef"},{id:"hotel",label:"Hotel Staff"}],
    shiftTypes:{Regular:1,Overtime:1.5,Holiday:2,Opening:1,Closing:1},
    shiftLabel:"Shift", incomeLabel:"Hourly Wage", notePlaceholder:"Location, role..." },
  { id:"military_public", icon:"🎖️", label:"Military & Public Safety",
    subs:[{id:"military",label:"Active Military"},{id:"reserve",label:"Reserve/Guard"},
          {id:"police",label:"Police Officer"},{id:"fire",label:"Firefighter"},
          {id:"corrections",label:"Corrections"},{id:"fed",label:"Federal Employee"}],
    shiftTypes:{Regular:1,Overtime:1.5,"Hazard":1.5,Holiday:2,"OT Night":1.65},
    shiftLabel:"Duty", incomeLabel:"Base Pay", notePlaceholder:"Unit, assignment..." },
  { id:"self_employed", icon:"🚀", label:"Self-Employed / Entrepreneur",
    subs:[{id:"freelancer",label:"Freelancer"},{id:"founder",label:"Founder"},
          {id:"creator",label:"Content Creator"},{id:"artist",label:"Artist/Musician"},
          {id:"photographer",label:"Photographer"},{id:"ecommerce",label:"eCommerce"}],
    shiftTypes:{Regular:1,Rush:2,Weekend:1.25,Project:1},
    shiftLabel:"Session", incomeLabel:"Revenue/Rate", notePlaceholder:"Client, project..." },
  { id:"finance_biz", icon:"💼", label:"Finance & Business",
    subs:[{id:"accountant",label:"Accountant/CPA"},{id:"advisor",label:"Financial Advisor"},
          {id:"banker",label:"Banker"},{id:"insurance",label:"Insurance Agent"},
          {id:"real_estate",label:"Real Estate Agent"},{id:"analyst",label:"Analyst"}],
    shiftTypes:{Regular:1,Overtime:1.5,Weekend:1.25},
    shiftLabel:"Session", incomeLabel:"Salary/Commission", notePlaceholder:"Client, deal..." },
  { id:"other", icon:"🧩", label:"Other",
    subs:[{id:"other_custom",label:"Other / Custom"}],
    shiftTypes:{Regular:1,Overtime:1.5,"Part-Time":1,Weekend:1.25},
    shiftLabel:"Session", incomeLabel:"Income", notePlaceholder:"Details..." },
];

/** Lookup by category id; falls back to last entry ("Other") so the UI never breaks. */
export const getProfession = (id) => PROFESSIONS.find((p) => p.id === id) || PROFESSIONS[PROFESSIONS.length - 1];

/** Lookup a sub-role within a category; falls back to the first sub. */
export const getProfSub = (pId, sId) => {
  const p = getProfession(pId);
  return p.subs.find((s) => s.id === sId) || p.subs[0];
};
