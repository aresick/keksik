import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import "./App.css";
import brandLogo from "./assets/brand-logo.png";
import engravingBorder from "./assets/engraving-border.png";
import api from "./api";

type RatingRow = {
  id: number;
  rank: number;
  fullName: string;
  group: string;
  total: number;
};

type LuckyLeader = {
  id: number;
  label: string;
  value: number;
  date: string;
};

type Nomination = {
  id: number;
  title: string;
  type: "motivating" | "fun";
  weight: number;
};

type Summary = {
  groupsCount: number;
  studentsCount: number;
  nominationsCount: number;
  topStudent: { fullName: string; total: number };
};

type Dynamics = { group: string; value: number };
type Role = "guest" | "student" | "teacher" | "admin";
type FeedItem = { id: number; text: string; time: string; date?: string };
type StudentNomination = {
  id: number;
  studentId: number;
  nominationId: number;
  awardedAt: string;
};

type LuckyPrize = {
  id: string;
  label: string;
  value: number;
  tone: string;
  description: string;
};

type LuckySpin = {
  id: string;
  label: string;
  value: number;
  date: string;
};

type ApprovalRequest = {
  id: number;
  requestType: string;
  status: "pending" | "approved" | "rejected";
  title: string;
  description: string;
  studentId?: number;
  nominationId?: number;
  points?: number;
  nominationTitle?: string;
  nominationType?: string;
  nominationWeight?: number;
  createdAt: string;
};

type User = {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  avatar?: string;
  initials: string;
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
};

const INITIAL_RATING: RatingRow[] = [
  { id: 1, rank: 1, fullName: "Иван Петров", group: "ПИ-21", total: 89.4 },
  { id: 2, rank: 2, fullName: "Мария Сидорова", group: "ПИ-21", total: 84.7 },
  { id: 3, rank: 3, fullName: "Екатерина Смирнова", group: "ИС-22", total: 80.2 },
  { id: 4, rank: 4, fullName: "Алексей Орлов", group: "ИС-22", total: 78.1 },
];

const INITIAL_NOMINATIONS: Nomination[] = [
  { id: 1, title: "Код-мастер", type: "motivating", weight: 1.3 },
  { id: 2, title: "Идейный генератор", type: "motivating", weight: 1.2 },
  { id: 3, title: "Архитектор решений", type: "motivating", weight: 1.15 },
  { id: 4, title: "Документационный ниндзя", type: "motivating", weight: 1.1 },
  { id: 5, title: "Командный катализатор", type: "motivating", weight: 1.05 },
  { id: 6, title: "Спящий тайфун", type: "fun", weight: 0.4 },
  { id: 7, title: "Стелс-студент", type: "fun", weight: 0.45 },
  { id: 8, title: "Энерджайзер", type: "fun", weight: 0.75 },
];

const MOTIVATION_QUOTES = [
  "Маленький прогресс каждый день дает большой результат в конце семестра.",
  "Сильная команда усиливает личный результат каждого участника.",
  "Побеждает не тот, кто не падает, а тот, кто быстро поднимается.",
  "Качество кода сегодня экономит часы завтра.",
];

const LUCKY_PRIZES: LuckyPrize[] = [
  { id: "spark", label: "+5 искр", value: 5, tone: "#2dd4bf", description: "Бодрый старт для личной игровой серии." },
  { id: "focus", label: "+8 фокуса", value: 8, tone: "#fbbf24", description: "Сегодня концентрация явно на твоей стороне." },
  { id: "combo", label: "+12 комбо", value: 12, tone: "#8b5cf6", description: "Красивый выпад: почти маленький джекпот." },
  { id: "badge", label: "Бейдж дня", value: 10, tone: "#38bdf8", description: "Витринный бонус для личного профиля." },
  { id: "boost", label: "+15 буст", value: 15, tone: "#34d399", description: "Сильный прокрут, можно гордиться." },
  { id: "quest", label: "Мини-квест", value: 7, tone: "#f472b6", description: "Колесо просит сделать маленький шаг к победе." },
  { id: "lucky", label: "+20 удачи", value: 20, tone: "#f59e0b", description: "Редкий сочный бонус для игрового зачета." },
  { id: "calm", label: "+3 дзен", value: 3, tone: "#93c5fd", description: "Небольшой, но приятный спокойный выигрыш." },
];

const LUCKY_DEMO_LEADERS: LuckySpin[] = [];

const todayKey = () => new Date().toISOString().slice(0, 10);

const statusLabels: Record<ApprovalRequest["status"], string> = {
  pending: "На рассмотрении",
  approved: "Одобрено",
  rejected: "Отклонено",
};

const requestTypeLabels: Record<string, string> = {
  "points-add": "начисление баллов",
  "points-remove": "снятие баллов",
  "nomination-add": "создание номинации",
  "nomination-delete": "удаление номинации",
};

const formatFeedDate = (item: FeedItem) => {
  const year = new Date().getFullYear();
  return item.date ? `${item.date} · ${item.time}` : `${item.time} · ${year}`;
};

const formatRequestDate = (date: string) =>
  new Date(date).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });




function App() {
  const location = useLocation();
  const [rating, setRating] = useState<RatingRow[]>([]);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [studentNominations, setStudentNominations] = useState<StudentNomination[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [assignmentForm, setAssignmentForm] = useState({
    studentId: INITIAL_RATING[0]?.id ?? 1,
    nominationId: INITIAL_NOMINATIONS[0]?.id ?? 1,
  });
  const [form, setForm] = useState({ title: "", type: "motivating", weight: "" });
  const [quote, setQuote] = useState(MOTIVATION_QUOTES[0]);
  const [selectedTopGroup, setSelectedTopGroup] = useState<string | null>(null);
  const [auth, setAuth] = useState<AuthState>(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        return { user, isAuthenticated: true };
      } catch {
        localStorage.removeItem("user");
      }
    }

    return { user: null, isAuthenticated: false };
  });


  const [showLogin, setShowLogin] = useState(false);
  const [showFullRating, setShowFullRating] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [ratingSearch, setRatingSearch] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme === "light" ? "light" : "dark";
  });
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [pointsForm, setPointsForm] = useState({ studentId: 0, points: 0, reason: "" });
  const [wheelRotation, setWheelRotation] = useState(0);

  
  const [isWheelSpinning, setIsWheelSpinning] = useState(false);
  const luckyWheelStorageKey = (userId?: number) =>
    userId ? `lucky-wheel-history-${userId}` : "lucky-wheel-history-guest";
  
  const [luckyHistory, setLuckyHistory] = useState<LuckySpin[]>([]);

  const LUCKY_LEADERBOARD_KEY = "lucky-wheel-leaderboard";

  const [luckyLeaderboard, setLuckyLeaderboard] = useState<LuckyLeader[]>(() => {
    const saved = localStorage.getItem(LUCKY_LEADERBOARD_KEY);
  
    if (!saved) return [];
  
    try {
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem(LUCKY_LEADERBOARD_KEY);
      return [];
    }
  });



  const avatarStorageKey = (user: Pick<User, "id" | "email">) => `user-avatar-${user.id}-${user.email}`;

  const persistUser = (user: User) => {
    localStorage.setItem("user", JSON.stringify(user));
    if (user.avatar) {
      localStorage.setItem(avatarStorageKey(user), user.avatar);
    }
  };

  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [achievements, setAchievements] = useState<{
    mostActiveGroup: string;
    breakthrough: string;
    bestDiscipline: string;
    teamSpirit: string;
  } | null>(null);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.body.className = newTheme;
  };

  useEffect(() => {
    const key = luckyWheelStorageKey(auth.user?.id);
    const saved = localStorage.getItem(key);
  
    if (!saved) {
      setLuckyHistory([]);
      return;
    }
  
    try {
      setLuckyHistory(JSON.parse(saved));
    } catch {
      localStorage.removeItem(key);
      setLuckyHistory([]);
    }
  }, [auth.user?.id]);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll(".reveal"));
    elements.forEach((element) => element.classList.add("animate"));

    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
          }
        });
      },
      { threshold: 0.15 },
    );

    elements.forEach((element) => observer.observe(element));

    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location.pathname, auth.isAuthenticated]);

  const fetchPublicData = async () => {
    try {
      const [ratingRes, nominationsRes, studentNomsRes, summaryRes] = await Promise.all([
        api.get('/students/rating'),
        api.get('/nominations'),
        api.get('/student-nominations'),
        api.get('/summary')
      ]);
      setRating(ratingRes.data);
      setNominations(nominationsRes.data);
      setStudentNominations(studentNomsRes.data);
      setSummary(summaryRes.data);
      void fetchFeedAndAchievements();
    } catch (err) {
      console.error('Ошибка загрузки публичных данных', err);
    }
  };

  const fetchAllData = async () => {
    try {
      const [ratingRes, nominationsRes, studentNomsRes, summaryRes] = await Promise.all([
        api.get('/students/rating'),
        api.get('/nominations'),
        api.get('/student-nominations'),
        api.get('/summary')
      ]);
      setRating(ratingRes.data);
      setNominations(nominationsRes.data);
      setStudentNominations(studentNomsRes.data);
      setSummary(summaryRes.data);
      void fetchFeedAndAchievements();
      if (auth.user?.role === "admin") {
        const requestsRes = await api.get('/requests');
        setRequests(requestsRes.data);
      }
    } catch (err) {
      console.error('Ошибка загрузки данных', err);
    }
  };

  const fetchFeedAndAchievements = async () => {
    try {
      const [feedRes, achRes] = await Promise.all([
        api.get('/events/feed?count=10'),
        api.get('/events/achievements')
      ]);
      setFeed(feedRes.data);
      setAchievements(achRes.data);
    } catch (err) {
      console.error('Ошибка загрузки событий', err);
    }
  };

  // Загрузка данных при авторизации
  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  useEffect(() => {
    if (auth.isAuthenticated) {
      fetchAllData();
    } else {
      fetchPublicData();
    }
  }, [auth.isAuthenticated]);

  const summaryData: Summary = useMemo(() => {
    if (summary) return summary;
    return {
      groupsCount: 0,
      studentsCount: 0,
      nominationsCount: 0,
      topStudent: { fullName: "-", total: 0 }
    };
  }, [summary]);

  const filteredRating = rating;

  const publicRatingRows = useMemo(() => rating.slice(0, 15), [rating]);

  const dynamics: Dynamics[] = useMemo(() => {
    const totalsByGroup = new Map<string, number>();
    filteredRating.forEach((item) => {
      totalsByGroup.set(item.group, (totalsByGroup.get(item.group) ?? 0) + item.total);
    });
    return Array.from(totalsByGroup.entries()).map(([group, value]) => ({
      group,
      value: Number(value.toFixed(2)),
    }));
  }, [filteredRating]);

  const activeDynamics = useMemo(
    () => dynamics.filter((item) => item.value > 0).sort((a, b) => b.value - a.value),
    [dynamics],
  );

  const inactiveGroupsCount = dynamics.length - activeDynamics.length;

  const topGroups = useMemo(() => {
    const total = dynamics.reduce((sum, d) => sum + d.value, 0);
    return dynamics
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
        percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0"
      }));
  }, [dynamics]);

  const chartColors = ['#7c3aed', '#a855f7', '#fbbf24', '#f59e0b', '#10b981'];

  useEffect(() => {
    if (!selectedTopGroup && topGroups.length > 0) {
      setSelectedTopGroup(topGroups[0].group);
    }
  }, [selectedTopGroup, topGroups]);

  const selectedTopGroupStudents = useMemo(() => {
    if (!selectedTopGroup) return [];
    return rating
      .filter((student) => student.group === selectedTopGroup)
      .sort((a, b) => b.total - a.total || a.fullName.localeCompare(b.fullName));
  }, [rating, selectedTopGroup]);

  const studentProfile = useMemo(() => {
    if (!auth.user) return rating[0];
    return (
      rating.find((student) => student.id === auth.user?.id) ??
      rating.find((student) => student.fullName === auth.user?.fullName) ??
      rating[0]
    );
  }, [auth.user, rating]);

  const searchedRatingRows = useMemo(() => {
    const query = ratingSearch.trim().toLowerCase();
    if (!query) return rating;
    return rating.filter((student) =>
      `${student.fullName} ${student.group} ${student.rank}`.toLowerCase().includes(query),
    );
  }, [rating, ratingSearch]);

  const highlightedRatingRow = searchedRatingRows[0];
  const studentNominationRows = useMemo(() => {
    return studentNominations
      .map((entry) => {
        const student = rating.find((item) => item.id === entry.studentId);
        const nomination = nominations.find((item) => item.id === entry.nominationId);
        if (!student || !nomination) return null;
        return {
          id: entry.id,
          studentId: student.id,
          studentName: student.fullName,
          nominationId: nomination.id,
          nominationTitle: nomination.title,
          nominationWeight: nomination.weight,
          group: student.group,
          awardedAt: entry.awardedAt,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [studentNominations, rating, nominations]);

  const awardedStudents = useMemo(() => {
    const map = new Map<number, { student: RatingRow; nominations: string[]; nominationScore: number }>();
    studentNominationRows.forEach((entry) => {
      const student = rating.find((item) => item.id === entry.studentId);
      if (!student) return;
      if (!map.has(student.id)) {
        map.set(student.id, { student, nominations: [], nominationScore: 0 });
      }
      const row = map.get(student.id);
      row?.nominations.push(entry.nominationTitle);
      if (row) {
        row.nominationScore += entry.nominationWeight;
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => b.nominationScore - a.nominationScore || b.nominations.length - a.nominations.length,
    );
  }, [studentNominationRows, rating]);

  const myNominations = useMemo(() => {
    if (!studentProfile) return [];
    return studentNominationRows.filter((item) => item.studentId === studentProfile.id);
  }, [studentNominationRows, studentProfile]);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests],
  );

  const luckyToday = todayKey();
  const todaySpin = useMemo(
    () => luckyHistory.find((item) => item.date === luckyToday),
    [luckyHistory, luckyToday],
  );
  const luckyTotal = useMemo(
    () => luckyHistory.reduce((sum, item) => sum + item.value, 0),
    [luckyHistory],
  );
  const luckyLeaders = useMemo(() => {
    return luckyLeaderboard
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((item) => ({
        id: `wheel-leader-${item.id}`,
        label: item.label,
        value: item.value,
        date: item.date,
      }));
  }, [luckyLeaderboard]);

  const spinLuckyWheel = () => {
    const currentUser = auth.user;
  
    if (!currentUser) return;
    if (isWheelSpinning || todaySpin) return;
  
    const prizeIndex = Math.floor(Math.random() * LUCKY_PRIZES.length);
    const prize = LUCKY_PRIZES[prizeIndex];
    const segmentAngle = 360 / LUCKY_PRIZES.length;
    const targetAngle = 360 - (prizeIndex * segmentAngle + segmentAngle / 2);
    const nextRotation = wheelRotation + 1440 + targetAngle;
  
    setIsWheelSpinning(true);
    setWheelRotation(nextRotation);
  
    window.setTimeout(() => {
      const nextHistory = [
        {
          id: `${prize.id}-${Date.now()}`,
          label: prize.label,
          value: prize.value,
          date: luckyToday,
        },
        ...luckyHistory,
      ].slice(0, 7);
  
      setLuckyHistory(nextHistory);
  
      localStorage.setItem(
        luckyWheelStorageKey(currentUser.id),
        JSON.stringify(nextHistory)
      );
  
      const currentTotal = nextHistory.reduce((sum, item) => sum + item.value, 0);
  
      const savedLeaderboard = localStorage.getItem(LUCKY_LEADERBOARD_KEY);
  
      let leaderboard: LuckyLeader[] = [];
  
      if (savedLeaderboard) {
        try {
          leaderboard = JSON.parse(savedLeaderboard);
        } catch {
          leaderboard = [];
        }
      }
  
      const withoutCurrentUser = leaderboard.filter(
        (item) => item.id !== currentUser.id
      );
  
      const nextLeaderboard = [
        ...withoutCurrentUser,
        {
          id: currentUser.id,
          label: currentUser.fullName,
          value: currentTotal,
          date: "мой результат",
        },
      ]
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
  
      setLuckyLeaderboard(nextLeaderboard);
  
      localStorage.setItem(
        LUCKY_LEADERBOARD_KEY,
        JSON.stringify(nextLeaderboard)
      );
  
      setIsWheelSpinning(false);
    }, 3400);
  };

  const createNomination = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    if (!form.weight) return;
    try {
      await api.post('/requests', {
        requestType: 'nomination-add',
        title: `Добавить номинацию: ${form.title.trim()}`,
        description: 'Заявка от преподавателя на создание номинации.',
        nominationTitle: form.title.trim(),
        nominationType: form.type,
        nominationWeight: Number(form.weight)
      });
      setForm({ title: "", type: "motivating", weight: "" });
      alert('Заявка на добавление номинации отправлена админу');
    } catch (err) {
      alert('Ошибка отправки заявки');
    }
  };

  const removeNomination = async (id: number) => {
    const nomination = nominations.find(item => item.id === id);
    if (!nomination) return;
    try {
      await api.post('/requests', {
        requestType: 'nomination-delete',
        title: `Удалить номинацию: ${nomination.title}`,
        description: 'Заявка от преподавателя на удаление номинации.',
        nominationId: id
      });
      alert('Заявка на удаление номинации отправлена админу');
    } catch (err) {
      alert('Ошибка отправки заявки');
    }
  };

  const assignNominationToStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await api.post('/student-nominations', {
        studentId: assignmentForm.studentId,
        nominationId: assignmentForm.nominationId
      });
      const [nominationsRes, ratingRes] = await Promise.all([
        api.get('/student-nominations'),
        api.get('/students/rating')
      ]);
      setStudentNominations(nominationsRes.data);
      setRating(ratingRes.data);
      await fetchFeedAndAchievements();
    } catch (err: any) {
      alert(err.response?.data || 'Ошибка назначения номинации');
    }
  };

  useEffect(() => {
    if (rating.length > 0 && nominations.length > 0) {
      setAssignmentForm({
        studentId: rating[0].id,
        nominationId: nominations[0].id
      });
    }
  }, [rating, nominations]);

  const removeStudentNomination = async (id: number) => {
    try {
      await api.delete(`/student-nominations/${id}`);
      setStudentNominations(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      alert('Ошибка удаления назначения');
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('Отправка запроса:', { email, password });
      const res = await api.post("/auth/login", { email, password });
      console.log('Ответ сервера:', res.data);
      const { token, user } = res.data;
      const savedAvatar = localStorage.getItem(avatarStorageKey(user));
      const nextUser = savedAvatar ? { ...user, avatar: savedAvatar } : user;
      localStorage.setItem("token", token);
      persistUser(nextUser);
      setAuth({ user: nextUser, isAuthenticated: true });
      setShowLogin(false);
      setLoginForm({ email: "", password: "" });
      return true;
    } catch (e) {
      console.error('Ошибка входа:', e);
      alert('Неверный email или пароль.');
      return false;
    }
  };

  const logout = () => {
    setAuth({ user: null, isAuthenticated: false });
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && auth.user) {
      const user = auth.user;
      const reader = new FileReader();
      reader.onload = (e) => {
        const avatarUrl = e.target?.result as string;
        const updatedUser: User = {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          initials: user.initials,
          avatar: avatarUrl
        };
        setAuth({ user: updatedUser, isAuthenticated: true });
        persistUser(updatedUser);
      };
      reader.readAsDataURL(file);
    }
  };



  /*const generateRandomAvatar = () => {
    const avatars = [
      'https://api.dicebear.com/7.x/svg?seed=Fluffy&backgroundColor=b6e3f4&radius=50',
      'https://api.dicebear.com/7.x/svg?seed=Bubbles&backgroundColor=ffdfbf&radius=50',
      'https://api.dicebear.com/7.x/svg?seed=Midnight&backgroundColor=5945b4&radius=50',
      'https://api.dicebear.com/7.x/svg?seed=Sparkle&backgroundColor=c084fc&radius=50',
      'https://api.dicebear.com/7.x/svg?seed=Kitty&backgroundColor=ffeb3b&radius=50',
      'https://api.dicebear.com/7.x/svg?seed=Panda&backgroundColor=000000&radius=50',
      'https://api.dicebear.com/7.x/svg?seed=Pixel&backgroundColor=4ade80&radius=50',
      'https://api.dicebear.com/7.x/svg?seed=Avataaars&backgroundColor=fb7185&radius=50',
      'https://api.dicebear.com/7.x/svg?seed=Bottts&backgroundColor=06ffa5&radius=50',
      'https://api.dicebear.com/7.x/svg?seed=Lorelei&backgroundColor=f472b6&radius=50',
      'https://api.dicebear.com/7.x/svg?seed=OpenPeeps&backgroundColor=8b5cf6&radius=50',
      'https://api.dicebear.com/7.x/svg?seed=Personas&backgroundColor=3b82f6&radius=50',
      'https://api.dicebear.com/7.x/svg?seed=Notionists&backgroundColor=ec4899&radius=50'
    ];
    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
    
    if (auth.user) {
      const updatedUser: User = {
        id: auth.user.id,
        fullName: auth.user.fullName,
        email: auth.user.email,
        role: auth.user.role,
        initials: auth.user.initials,
        avatar: randomAvatar
      };
      setAuth({ user: updatedUser, isAuthenticated: true });
      localStorage.setItem("demo-user", JSON.stringify(updatedUser));
    }
  };*/

  const selectAvatar = (avatarUrl: string) => {
    if (auth.user) {
      const updatedUser: User = {
        id: auth.user.id,
        fullName: auth.user.fullName,
        email: auth.user.email,
        role: auth.user.role,
        initials: auth.user.initials,
        avatar: avatarUrl
      };
      setAuth({ user: updatedUser, isAuthenticated: true });
      persistUser(updatedUser);
      setShowAvatarModal(false);
    }
  };

  const addPointsToStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const student = rating.find(item => item.id === pointsForm.studentId);
    try {
      await api.post('/requests', {
        requestType: pointsForm.points >= 0 ? 'points-add' : 'points-remove',
        title: `${pointsForm.points >= 0 ? 'Начислить' : 'Снять'} баллы: ${student?.fullName ?? 'студент'}`,
        description: pointsForm.reason || 'Заявка от преподавателя на изменение баллов.',
        studentId: pointsForm.studentId,
        points: Math.abs(pointsForm.points)
      });
      setPointsForm({ studentId: 0, points: 0, reason: "" });
      alert('Заявка на изменение баллов отправлена админу');
    } catch (err) {
      alert('Ошибка отправки заявки');
    }
  };

  const resolveRequest = async (id: number, action: "approve" | "reject") => {
    try {
      await api.post(`/requests/${id}/${action}`);
      const [requestsRes, ratingRes, nominationsRes, summaryRes] = await Promise.all([
        api.get('/requests'),
        api.get('/students/rating'),
        api.get('/nominations'),
        api.get('/summary')
      ]);
      setRequests(requestsRes.data);
      setRating(ratingRes.data);
      setNominations(nominationsRes.data);
      setSummary(summaryRes.data);
      await fetchFeedAndAchievements();
    } catch {
      alert('Ошибка обработки заявки');
    }
  };

  const clearProcessedRequests = async () => {
    try {
      await api.delete('/requests/processed');
      const requestsRes = await api.get('/requests');
      setRequests(requestsRes.data);
    } catch {
      alert('Ошибка очистки заявок');
    }
  };

  const applyAdminPoints = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await api.post('/students/points', {
        studentId: pointsForm.studentId,
        points: pointsForm.points
      });
      const [ratingRes, summaryRes] = await Promise.all([
        api.get('/students/rating'),
        api.get('/summary')
      ]);
      setRating(ratingRes.data);
      setSummary(summaryRes.data);
      await fetchFeedAndAchievements();
      setPointsForm({ studentId: 0, points: 0, reason: "" });
    } catch {
      alert('Ошибка изменения баллов');
    }
  };

  const createNominationDirect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    if (!form.weight) return;
    try {
      const res = await api.post('/nominations', {
        title: form.title.trim(),
        type: form.type,
        weight: Number(form.weight)
      });
      setNominations(prev => [...prev, res.data]);
      setForm({ title: "", type: "motivating", weight: "" });
      const summaryRes = await api.get('/summary');
      setSummary(summaryRes.data);
    } catch {
      alert('Ошибка добавления номинации');
    }
  };

  const removeNominationDirect = async (id: number) => {
    try {
      await api.delete(`/nominations/${id}`);
      setNominations(prev => prev.filter(item => item.id !== id));
      setStudentNominations(prev => prev.filter(item => item.nominationId !== id));
      const summaryRes = await api.get('/summary');
      setSummary(summaryRes.data);
    } catch {
      alert('Ошибка удаления номинации');
    }
  };

  const availableAvatars = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=1&radius=50&backgroundColor=b6e3f4',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=2&radius=50&backgroundColor=ffdfbf',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=3&radius=50&backgroundColor=5945b4',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=4&radius=50&backgroundColor=c084fc',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=5&radius=50&backgroundColor=ffeb3b',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=6&radius=50&backgroundColor=000000',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=7&radius=50&backgroundColor=4ade80',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=8&radius=50&backgroundColor=fb7185',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=9&radius=50&backgroundColor=06ffa5',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=10&radius=50&backgroundColor=f472b6',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=11&radius=50&backgroundColor=8b5cf6',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=12&radius=50&backgroundColor=3b82f6'
  ];

  const rollQuote = () => {
    const random = MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)];
    setQuote(random);
  };

  const getStudentAvatar = (student: Pick<RatingRow, "id">) => {
    if (auth.user?.id === student.id && auth.user.avatar) {
      return auth.user.avatar;
    }

    return availableAvatars[student.id % availableAvatars.length];
  };

  const renderHeader = () => (
    <header className="header">
      <div className="headerTop">
        <span className={`badge ${scrolled ? 'scrolled' : ''}`}>
          <img src={brandLogo} alt="Логотип проекта" />
        </span>
        {auth.isAuthenticated && (
          <div className="userWelcome">
            {auth.user && (
              <div className="headerUserAvatar">
                {auth.user.avatar ? (
                  <img src={auth.user.avatar} alt="Avatar" />
                ) : (
                  <span className="initials">{auth.user.initials}</span>
                )}
              </div>
            )}
            <span className="welcomeText">Добро пожаловать, {auth.user?.fullName}!</span>
          </div>
        )}
        <div className="authSection">
          {auth.isAuthenticated ? (
            <button onClick={logout} className="logoutBtn">Выйти</button>
          ) : (
            <button onClick={() => setShowLogin(true)} className="loginBtn">Войти</button>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            className="themeToggleBtn"
            aria-label={theme === "dark" ? "Включить светлую тему" : "Включить темную тему"}
            aria-pressed={theme === "light"}
          >
            <span className="themeToggleAura" aria-hidden="true" />
            <span className="themeToggleOrbit" aria-hidden="true" />
            <span className="themeToggleSpark sparkA" aria-hidden="true" />
            <span className="themeToggleSpark sparkB" aria-hidden="true" />
            <span className="themeIcon themeIconSun" aria-hidden="true" />
            <span className="themeIcon themeIconMoon" aria-hidden="true" />
          </button>
        </div>
      </div>
      <h1>Геймифицированный рейтинг студентов</h1>
      <p>АНПОО Академический колледж Волгоград</p>
      <div className="heroActions">
        <a href="#public-rating" className="ctaPrimary">
          Смотреть рейтинг
        </a>
        <a href="#public-extras" className="ctaGhost">
          Что нового
        </a>
      </div>
      <div className="tickerWrap">
        <div className="ticker">
          <span>РЕЙТИНГ • НОМИНАЦИИ • ДОСТИЖЕНИЯ • ПРОГРЕСС • КОМАНДНАЯ ИГРА •</span>
          <span>РЕЙТИНГ • НОМИНАЦИИ • ДОСТИЖЕНИЯ • ПРОГРЕСС • КОМАНДНАЯ ИГРА •</span>
        </div>
      </div>
      <nav className="topNav">
        <NavLink to="/">Публичная страница</NavLink>
        {auth.isAuthenticated && (
          <>
            {auth.user?.role === 'student' && (
              <NavLink to="/student">Кабинет студента</NavLink>
            )}
            {auth.user?.role === 'teacher' && (
              <NavLink to="/teacher">Кабинет преподавателя</NavLink>
            )}
            {auth.user?.role === 'admin' && (
              <NavLink to="/admin">
                Кабинет админа
                {pendingRequests.length > 0 && <span className="requestBadge">{pendingRequests.length}</span>}
              </NavLink>
            )}
          </>
        )}
      </nav>
    </header>
  );

  const renderMetricsCards = () => (
    <section className="cards">
      <article className="card">
        <span>Группы</span>
        <strong>{summaryData.groupsCount}</strong>
      </article>
      <article className="card">
        <span>Студенты</span>
        <strong>{summaryData.studentsCount}</strong>
      </article>
      <article className="card">
        <span>Активные номинации</span>
        <strong>{summaryData.nominationsCount}</strong>
      </article>
      <article className="card leaderMetricCard">
        <span>Лидер периода</span>
        <strong>{summaryData.topStudent.fullName}</strong>
      </article>
    </section>
  );

  const renderRatingTable = (limit = 15) => {
    const ratingRows = publicRatingRows.slice(0, limit);
    const maxVisibleTotal = Math.max(...ratingRows.map((row) => row.total), 1);
    const currentStudentRank = auth.user?.role === "student" ? studentProfile?.rank : null;
    const isCompactRating = limit < 15;

    return (
      <article className={`panel leaderboardPanel ${isCompactRating ? "compactLeaderboardPanel" : ""}`}>
        <div className="leaderboardHeader">
          <div>
            <h2>Публичный рейтинг</h2>
            <p>Топ-{limit} студентов по текущим баллам</p>
          </div>
          <div className="headerActions">
            {currentStudentRank && <span>Ваше место: #{currentStudentRank}</span>}
            <span>{ratingRows.length} мест</span>
            <button type="button" onClick={() => setShowFullRating(true)}>
              Показать весь топ
            </button>
          </div>
        </div>
        <div className="leaderboardList">
          {ratingRows.map((row) => (
            <div key={row.id} className={`leaderboardRow ${row.rank <= 3 ? "topRank" : ""}`}>
              <span className={`leaderboardRank rank-${row.rank <= 3 ? row.rank : "default"}`}>
                {row.rank}
              </span>
              <div className="leaderboardStudent">
                <strong>{row.fullName}</strong>
                <span>{row.group} · место #{row.rank}</span>
              </div>
              {!isCompactRating && (
                <img className="leaderboardAvatar" src={getStudentAvatar(row)} alt={row.fullName} />
              )}
              <div className="leaderboardScore">
                <strong className="leaderboardPoints">{row.total}</strong>
                <span>баллов</span>
              </div>
              <div className="leaderboardProgress" aria-hidden="true">
                <div style={{ width: `${Math.max((row.total / maxVisibleTotal) * 100, 8)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </article>
    );
  };

  const TrophyIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="trophyIcon">
      <path d="M12 2L14.5 8.5L19 9L15 13L14 19L12 17L10 19L5 13L0.5 8.5L5 2L12 2Z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
      <circle cx="12" cy="8" r="2" fill="#fff" />
    </svg>
  );

  const NominationTopIcon = ({ index }: { index: number }) => {
    const icons = [
      <path key="laurel" d="M8 18c-3.2-1.4-5-4-5-7 0-3.4 2.5-6.2 5.9-6.9M16 18c3.2-1.4 5-4 5-7 0-3.4-2.5-6.2-5.9-6.9M8 18h8M9 13l3-7 3 7-3-1.7L9 13Z" />,
      <path key="spark" d="M12 3l1.7 5.2L19 10l-5.3 1.8L12 17l-1.7-5.2L5 10l5.3-1.8L12 3ZM6 15l.8 2.2L9 18l-2.2.8L6 21l-.8-2.2L3 18l2.2-.8L6 15ZM18 14l.6 1.7 1.7.6-1.7.6L18 18.6l-.6-1.7-1.7-.6 1.7-.6L18 14Z" />,
      <path key="badge" d="M12 3l6 3v5c0 4-2.4 7.6-6 9-3.6-1.4-6-5-6-9V6l6-3ZM9 12l2 2 4-5" />,
      <path key="bolt" d="M13 2L5 13h6l-1 9 8-12h-6l1-8Z" />,
    ];

    return (
      <span className="nominationTopIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          {icons[index % icons.length]}
        </svg>
      </span>
    );
  };

  const renderDynamicsChart = () => {
    const chartRows = activeDynamics.length ? activeDynamics : dynamics.slice(0, 8);
    const chartHeight = Math.max(260, chartRows.length * 64 + 90);
    const axisColor = theme === "light" ? "#0f766e" : "#a855f7";
    const axisTextColor = theme === "light" ? "#0f766e" : "#d6d2e3";
    const gridStroke = theme === "light" ? "rgba(15, 118, 110, 0.16)" : "rgba(255, 255, 255, 0.1)";

    return (
      <article className="panel dynamicsPanel">
        <div className="chartHeader">
          <div>
            <h2>Динамика по группам</h2>
            <p>Группы с набранными баллами за текущий период.</p>
          </div>
          <div className="chartMeta">
            <strong>{activeDynamics.length}</strong>
            <span>активных групп</span>
          </div>
          {inactiveGroupsCount > 0 && (
            <div className="chartMeta muted">
              <strong>{inactiveGroupsCount}</strong>
              <span>пока без баллов</span>
            </div>
          )}
        </div>
        <div className="chartContainer" style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartRows} layout="vertical" margin={{ top: 12, right: 36, bottom: 12, left: 22 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                type="number"
                stroke={axisColor}
                tick={{ fill: axisTextColor }}
              />
              <YAxis
                type="category"
                dataKey="group"
                stroke={axisColor}
                tick={{ fill: axisTextColor, fontSize: 12, fontWeight: 700 }}
                width={116}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(26, 26, 46, 0.9)',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="value" barSize={46} radius={[0, 8, 8, 0]}>
                {chartRows.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    );
  };

  const renderAnimatedPodium = () => {
    const podium = filteredRating.slice(0, 3);
    const orderedPodium = [podium[1], podium[0], podium[2]].filter(
      (row): row is RatingRow => Boolean(row),
    );
    const maxPodiumTotal = Math.max(...podium.map((row) => row.total), 1);
    const getPodiumAvatar = (row: RatingRow) =>
      availableAvatars[(row.id + row.rank) % availableAvatars.length];

    return (
      <section className="podiumShowcase reveal">
        <div className="podiumShowcaseHeader">
          <div>
            <h2>Подиум топ-3</h2>
            <p>Главные лидеры рейтинга прямо сейчас</p>
          </div>
          <span>топ студентов</span>
        </div>
        <div className="podiumStage">
          {orderedPodium.map((row) => (
            <article key={row.id} className={`podiumChampion rank-${row.rank}`}>
              <span className="podiumGlow" />
              <div className="podiumMedal" aria-label={`Место ${row.rank}`}>
                <span className="medalRibbon" aria-hidden="true" />
                <span className="medalFace">{row.rank === 1 ? "1" : row.rank === 2 ? "2" : "3"}</span>
              </div>
              <div className="podiumAvatarFigure">
                <span className="avatarSparkle sparkleOne" />
                <span className="avatarSparkle sparkleTwo" />
                <img className="podiumUserAvatar" src={getPodiumAvatar(row)} alt={row.fullName} />
                <span className="avatarShadow" />
              </div>
              <div className="podiumPerson">
                <strong>{row.fullName}</strong>
                <span>{row.group}</span>
              </div>
              <div className="podiumScore">
                <b>{row.total}</b>
                <span>баллов</span>
              </div>
              <div className="podiumColumn">
                <div style={{ height: `${Math.max((row.total / maxPodiumTotal) * 100, 28)}%` }} />
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  };

  const renderTopGroups = () => (
    <article className="panel topGroupsPanel">
      <h2>🏆 Топ групп</h2>
      <div className="topGroupsGrid">
        {topGroups.map((group, index) => (
          <div key={group.group} className="topGroupEntry">
            <button
              type="button"
              className={`topGroupCard ${selectedTopGroup === group.group ? "active" : ""}`}
              onClick={() => setSelectedTopGroup(group.group)}
            >
              <div className="groupRank">
                <span className="rankNumber">{group.rank}</span>
                <TrophyIcon />
              </div>
              <div className="groupInfo">
                <h3>{group.group}</h3>
                <div className="groupStats">
                  <div className="statItem">
                    <span className="statValue">{group.value}</span>
                    <span className="statLabel">Баллов</span>
                  </div>
                  <div className="statItem">
                    <span className="statValue">{group.percentage}%</span>
                    <span className="statLabel">Доля</span>
                  </div>
                </div>
              </div>
              <div className="groupProgress">
                <div className="progressBar">
                  <div
                    className="progressFill"
                    style={{
                      width: `${group.percentage}%`,
                      backgroundColor: chartColors[index % chartColors.length]
                    }}
                  />
                </div>
              </div>
            </button>
            {selectedTopGroup === group.group && (
              <div className="groupStudentsPanel">
                <div className="groupStudentsHeader">
                  <h3>{group.group}</h3>
                  <span>{selectedTopGroupStudents.length} студентов</span>
                </div>
                <ul className="groupStudentsList">
                  {selectedTopGroupStudents.map((student, studentIndex) => (
                    <li key={student.id}>
                      <span>{studentIndex + 1}</span>
                      <strong>{student.fullName}</strong>
                      <em>{student.total} баллов</em>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </article>
  );

  const renderNominationManager = () => (
    <section className="grid">
      <article className="panel nominationRequestPanel">
        <h2>Заявка на номинацию</h2>
        <form className="form" onSubmit={createNomination}>
          <input
            placeholder="Название номинации"
            value={form.title}
            onChange={(e) => setForm((old) => ({ ...old, title: e.target.value }))}
          />
          <select
            value={form.type}
            onChange={(e) =>
              setForm((old) => ({ ...old, type: e.target.value as "motivating" | "fun" }))
            }
          >
            <option value="motivating">Мотивирующая</option>
            <option value="fun">Шуточная</option>
          </select>
          <input
            type="number"
            min={0.1}
            max={5}
            step={0.05}
            placeholder="Укажите количество баллов"
            aria-label="Укажите количество баллов"
            value={form.weight}
            onChange={(e) => setForm((old) => ({ ...old, weight: e.target.value }))}
            required
          />
          <button type="submit">Отправить заявку</button>
        </form>
      </article>

      <article className="panel teacherNominationListPanel">
        <h2>Список номинаций</h2>
        <ul className="nominationList">
          {nominations.map((nomination) => (
            <li key={nomination.id}>
              <div>
                <strong>{nomination.title}</strong>
                <span>
                  {nomination.type === "motivating" ? "Мотивирующая" : "Шуточная"} | Баллы:{" "}
                  {nomination.weight}
                </span>
              </div>
              <button onClick={() => removeNomination(nomination.id)}>Запросить удаление</button>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );

  const renderStudentNominationAssignment = () => (
    <section className="grid">
      <article className="panel teacherAssignmentPanel">
        <h2>Назначить номинацию студенту</h2>
        <form className="form" onSubmit={assignNominationToStudent}>
          <select
            value={assignmentForm.studentId}
            onChange={(event) =>
              setAssignmentForm((old) => ({ ...old, studentId: Number(event.target.value) }))
            }
          >
            {rating.map((student) => (
              <option key={student.id} value={student.id}>
                {student.fullName} ({student.group})
              </option>
            ))}
          </select>
          <select
            value={assignmentForm.nominationId}
            onChange={(event) =>
              setAssignmentForm((old) => ({ ...old, nominationId: Number(event.target.value) }))
            }
          >
            {nominations.map((nomination) => (
              <option key={nomination.id} value={nomination.id}>
                {nomination.title}
              </option>
            ))}
          </select>
          <button type="submit">Назначить</button>
        </form>
      </article>

      <article className="panel teacherAwardedPanel">
        <h2>Выданные номинации</h2>
        <ul className="assignmentList">
          {studentNominationRows.map((entry) => (
            <li key={entry.id}>
              <div>
                <strong>{entry.studentName}</strong>
                <span>
                  {entry.nominationTitle} | {entry.group} | {entry.awardedAt}
                </span>
              </div>
              <button onClick={() => removeStudentNomination(entry.id)}>Убрать</button>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );

  const renderUnauthorized = (expected: string) => (
    <article className="panel">
      <h2>Ограничение доступа</h2>
      <p>Эта страница доступна только для роли: {expected}.</p>
      <p>Пожалуйста, войдите в систему для доступа.</p>
      <button onClick={() => setShowLogin(true)} className="loginBtn">Войти</button>
    </article>
  );

  const renderPointsManager = () => (
    <article className="panel pointsRequestPanel">
      <h2>Заявка на изменение баллов</h2>
      <form className="form" onSubmit={addPointsToStudent}>
        <select
          value={pointsForm.studentId}
          onChange={(e) => setPointsForm(old => ({ ...old, studentId: Number(e.target.value) }))}
          required
        >
          <option value="">Выберите студента</option>
          {rating.map((student) => (
            <option key={student.id} value={student.id}>
              {student.fullName} ({student.group}) - {student.total} баллов
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Количество баллов"
          value={pointsForm.points || ""}
          onChange={(e) => setPointsForm(old => ({ ...old, points: Number(e.target.value) }))}
          required
        />
        <input
          type="text"
          placeholder="Причина изменения"
          value={pointsForm.reason}
          onChange={(e) => setPointsForm(old => ({ ...old, reason: e.target.value }))}
          required
        />
        <button type="submit">
          Отправить заявку
        </button>
      </form>
    </article>
  );

  const renderAdminRequests = () => (
    <article className="panel adminRequestsPanel">
      <div className="leaderboardHeader">
        <div>
          <h2>Заявки преподавателей</h2>
          <p>Подтверждение изменений перед публикацией в рейтинге.</p>
        </div>
        <div className="headerActions">
          <span>{pendingRequests.length} новых</span>
          <button type="button" onClick={clearProcessedRequests}>Очистить</button>
        </div>
      </div>
      <ul className="requestList">
        {requests.length ? requests.map((request) => (
          <li key={request.id} className={`requestItem ${request.status}`}>
            <div>
              <strong>{request.title}</strong>
              <span>{request.description || "Без описания"}</span>
              <small>{requestTypeLabels[request.requestType] ?? request.requestType} • {formatRequestDate(request.createdAt)}</small>
            </div>
            <div className="requestStatus">{statusLabels[request.status]}</div>
            {request.status === "pending" && (
              <div className="requestActions">
                <button type="button" onClick={() => resolveRequest(request.id, "approve")}>Одобрить</button>
                <button type="button" onClick={() => resolveRequest(request.id, "reject")}>Отклонить</button>
              </div>
            )}
          </li>
        )) : (
          <li className="requestItem empty">
            <div>
              <strong>Заявок пока нет</strong>
              <span>Когда преподаватель отправит изменение, оно появится здесь.</span>
            </div>
          </li>
        )}
      </ul>
    </article>
  );

  const renderAdminPointsManager = () => (
    <article className="panel adminPointsPanel">
      <h2>Управление баллами</h2>
      <form className="form" onSubmit={applyAdminPoints}>
        <select
          value={pointsForm.studentId}
          onChange={(e) => setPointsForm(old => ({ ...old, studentId: Number(e.target.value) }))}
          required
        >
          <option value="">Выберите студента</option>
          {rating.map((student) => (
            <option key={student.id} value={student.id}>
              {student.fullName} ({student.group}) - {student.total} баллов
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Баллы, например 5 или -3"
          value={pointsForm.points || ""}
          onChange={(e) => setPointsForm(old => ({ ...old, points: Number(e.target.value) }))}
          required
        />
        <button type="submit">Применить баллы</button>
      </form>
    </article>
  );

  const renderAdminNominations = () => (
    <article className="panel adminNominationsPanel">
      <h2>Номинации</h2>
      <form className="form compactForm" onSubmit={createNominationDirect}>
        <input
          placeholder="Название номинации"
          value={form.title}
          onChange={(e) => setForm((old) => ({ ...old, title: e.target.value }))}
        />
        <select
          value={form.type}
          onChange={(e) =>
            setForm((old) => ({ ...old, type: e.target.value as "motivating" | "fun" }))
          }
        >
          <option value="motivating">Мотивирующая</option>
          <option value="fun">Шуточная</option>
        </select>
        <input
          type="number"
          min={0.1}
          max={5}
          step={0.05}
          placeholder="Укажите количество баллов"
          aria-label="Укажите количество баллов"
          value={form.weight}
          onChange={(e) => setForm((old) => ({ ...old, weight: e.target.value }))}
          required
        />
        <button type="submit">Добавить</button>
      </form>
      <ul className="nominationList adminNominationList">
        {nominations.map((nomination) => (
          <li key={nomination.id}>
            <div>
              <strong>{nomination.title}</strong>
              <span>
                {nomination.type === "motivating" ? "Мотивирующая" : "Шуточная"} | Баллы: {nomination.weight}
              </span>
            </div>
            <button type="button" onClick={() => removeNominationDirect(nomination.id)}>Удалить</button>
          </li>
        ))}
      </ul>
    </article>
  );

  const renderLuckyWheel = () => {
    const wheelBackground = `conic-gradient(${LUCKY_PRIZES.map((prize, index) => {
      const start = (index / LUCKY_PRIZES.length) * 100;
      const end = ((index + 1) / LUCKY_PRIZES.length) * 100;
      return `${prize.tone} ${start}% ${end}%`;
    }).join(", ")})`;
    const latestPrize = todaySpin ?? luckyHistory[0];

    return (
      <article className="panel luckyWheelPanel">
        <div className="luckyHeader">
          <div>
            <h2>Колесо удачи</h2>
            <p>Крути раз в день и собирай личные игровые бонусы.</p>
          </div>
          <div className="luckyScore">
            <strong>{luckyTotal}</strong>
            <span>очков удачи</span>
          </div>
        </div>

        <div className="luckyWheelGrid">
          <div className="wheelStage">
            <div className="wheelPointer" />
            <div
              className={`luckyWheel ${isWheelSpinning ? "spinning" : ""}`}
              style={{ background: wheelBackground, transform: `rotate(${wheelRotation}deg)` }}
            >
              {LUCKY_PRIZES.map((prize) => (
                <span key={prize.id} className="wheelDot" style={{ backgroundColor: prize.tone }} />
              ))}
              <div className="wheelCenter">
                <strong>АК</strong>
                <span>удача</span>
              </div>
            </div>
            <div className="wheelLegend" aria-label="Секторы колеса удачи">
              {LUCKY_PRIZES.map((prize) => (
                <span key={prize.id}>
                  <i style={{ backgroundColor: prize.tone }} />
                  {prize.label}
                </span>
              ))}
            </div>
          </div>

          <div className="luckySide">
            <div className="luckyMeaning">
              <strong>Зачем нужны очки удачи?</strong>
              <span>Это отдельный игровой зачёт кабинета: серия прокрутов, бейджи и будущий публичный топ колеса. На официальный рейтинг они не влияют.</span>
            </div>
            <div className="luckyResult">
              <span>{todaySpin ? "Сегодня выпало" : isWheelSpinning ? "Колесо крутится" : "Готово к прокруту"}</span>
              <strong>{isWheelSpinning ? "..." : latestPrize?.label ?? "Жми кнопку"}</strong>
              <p>
                {todaySpin
                  ? "Новый прокрут будет доступен завтра."
                  : LUCKY_PRIZES.find((item) => item.label === latestPrize?.label)?.description ??
                  "Поймай свой бонус дня и пополни личную коллекцию."}
              </p>
            </div>
            <button type="button" onClick={spinLuckyWheel} disabled={Boolean(todaySpin) || isWheelSpinning}>
              {todaySpin ? "Уже крутили сегодня" : isWheelSpinning ? "Крутим..." : "Крутить колесо"}
            </button>
            <div className="luckyHistory">
              <span>Последние выигрыши</span>
              {luckyHistory.length ? (
                luckyHistory.slice(0, 4).map((item) => (
                  <div key={item.id}>
                    <strong>{item.label}</strong>
                    <small>{item.date}</small>
                  </div>
                ))
              ) : (
                <p>История появится после первого прокрута.</p>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  };

  const renderLuckyWheelTop = () => {
    const maxLuckyScore = Math.max(...luckyLeaders.map((player) => player.value), 1);

    return (
      <article className="panel luckyTopPanel">
        <div className="leaderboardHeader luckyTopHeader">
          <div>
            <h2>Топ колеса удачи</h2>
            <p>Пять лучших игроков по личным очкам удачи.</p>
          </div>
          <span>{luckyLeaders.length} мест</span>
        </div>

        <div className="luckyTopBoard">
          {luckyLeaders.length ? (
            luckyLeaders.map((player, index) => {
              const rank = index + 1;
              return (
                <article key={player.id} className={`luckyBoardRow rank-${rank}`}>
                  <div className="luckyBoardPlace">
                    <span>{rank}</span>
                  </div>
                  <div className="luckyPlayer">
                    <small>{rank === 1 ? "лидер колеса" : player.date}</small>
                    <strong>{player.label}</strong>
                    <i style={{ width: `${Math.max((player.value / maxLuckyScore) * 100, 18)}%` }} />
                  </div>
                  <div className="luckyBoardScore">
                    <b>{player.value}</b>
                    <span>очков</span>
                  </div>
                </article>
              );
            })
          ) : (
            <article className="luckyBoardRow">
              <div className="luckyPlayer">
                <small>пока нет данных</small>
                <strong>Топ появится после первых прокрутов</strong>
              </div>
              <div className="luckyBoardScore">
                <b>0</b>
                <span>очков</span>
              </div>
            </article>
          )}
        </div>
      </article>
    );
  };

  const renderNominationShowcase = () => (
    <section className="panel nominationShowcase reveal">
      <div className="nominationShowcaseHeader">
        <div>
          <h2>Топ студентов по номинациям</h2>
          <p>Кто чаще всего получает отметки, сколько у него баллов и какие номинации уже собраны.</p>
        </div>
        <span>{awardedStudents.length} участников</span>
      </div>
      <div className="nominationShowcaseGrid">
        {awardedStudents.map((item, index) => (
          <article
            key={item.student.id}
            className={`nominationShowcaseCard ${index === 0 ? "leader" : ""}`}
            style={{ "--award-index": index } as CSSProperties}
          >
            <div className="nominationPlace">
              <span className="awardMedal">#{index + 1}</span>
              <img
                className="nominationUserAvatar"
                src={
                  auth.user?.id === item.student.id && auth.user.avatar
                    ? auth.user.avatar
                    : availableAvatars[(item.student.id + index) % availableAvatars.length]
                }
                alt={item.student.fullName}
              />
            </div>
            <NominationTopIcon index={index} />
            <div className="nominationShowcaseMain">
              <strong>{item.student.fullName}</strong>
              <small>{item.student.group}</small>
            </div>
            <div className="nominationShowcaseStats">
              <span>
                <b>{item.nominations.length}</b>
                номинаций
              </span>
              <span>
                <b>{item.nominationScore.toFixed(2)}</b>
                баллов номинаций
              </span>
            </div>
            <div className="chips">
              {item.nominations.map((nomination, nominationIndex) => (
                <span key={`${item.student.id}-${nominationIndex}`} className="chip">
                  {nomination}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );

  const renderAvatarModal = () => {
    if (!showAvatarModal) return null;

    return (
      <div className="modalOverlay" onClick={() => setShowAvatarModal(false)}>
        <div className="avatarModal" onClick={(e) => e.stopPropagation()}>
          <h2>Выберите аватар</h2>
          <div className="avatarGrid">
            {availableAvatars.map((avatar, index) => (
              <div
                key={index}
                className={`avatarOption ${auth.user?.avatar === avatar ? 'selected' : ''}`}
                onClick={() => selectAvatar(avatar)}
              >
                <img src={avatar} alt={`Avatar ${index + 1}`} />
              </div>
            ))}
          </div>
          <button className="closeModal" onClick={() => setShowAvatarModal(false)}>×</button>
        </div>
      </div>
    );
  };

  const renderFullRatingModal = () => {
    if (!showFullRating) return null;

    return (
      <div className="modalOverlay" onClick={() => setShowFullRating(false)}>
        <div className="ratingSearchModal" onClick={(e) => e.stopPropagation()}>
          <div className="ratingSearchHeader">
            <div>
              <h2>Полный рейтинг</h2>
              <p>Введите ФИО или группу, чтобы сразу найти студента и его место.</p>
            </div>
            <button className="closeModal" onClick={() => setShowFullRating(false)}>×</button>
          </div>
          <input
            className="ratingSearchInput"
            placeholder="ФИО студента или группа"
            value={ratingSearch}
            onChange={(event) => setRatingSearch(event.target.value)}
            autoFocus
          />
          {ratingSearch.trim() && highlightedRatingRow && (
            <div className="ratingSearchResult">
              <span>Найден студент</span>
              <strong>{highlightedRatingRow.fullName}</strong>
              <b>#{highlightedRatingRow.rank}</b>
              <small>{highlightedRatingRow.group} · {highlightedRatingRow.total} баллов</small>
            </div>
          )}
          <div className="fullRatingList">
            {searchedRatingRows.map((student) => (
              <div key={student.id} className={student.id === highlightedRatingRow?.id ? "highlighted" : ""}>
                <span>#{student.rank}</span>
                <strong>{student.fullName}</strong>
                <small>{student.group}</small>
                <b>{student.total}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderLoginModal = () => {
    if (!showLogin) return null;

    return (
      <div className="modalOverlay" onClick={() => setShowLogin(false)}>
        <div className="modal loginModal" onClick={(e) => e.stopPropagation()}>
          <h2>Вход в систему</h2>
          <form
            className="loginForm"
            onSubmit={async (e) => {
              e.preventDefault();
              const success = await login(loginForm.email, loginForm.password);

              if (!success) {
                alert("Неверный email или пароль.");
              }
            }}
          >
            <input
              type="email"
              placeholder="Email"
              value={loginForm.email}
              onChange={(e) => setLoginForm(old => ({ ...old, email: e.target.value }))}
              required
            />
            <input
              type="password"
              placeholder="Пароль"
              value={loginForm.password}
              onChange={(e) => setLoginForm(old => ({ ...old, password: e.target.value }))}
              required
            />
            <button type="submit">Войти</button>
          </form>
          <div className="demoInfo">
            <p><strong>🔓 Демо-доступ:</strong></p>
            <div className="demoCredentials">
              <div className="demoCredentialCard">
                <strong>Студент</strong>
                <span>Email: ivan@student.edu</span>
                <span>Пароль: demo</span>
              </div>
              <div className="demoCredentialCard">
                <strong>Преподаватель</strong>
                <span>Email: alexey@teacher.edu</span>
                <span>Пароль: demo</span>
              </div>
              <div className="demoCredentialCard">
                <strong>Админ</strong>
                <span>Email: admin@college.edu</span>
                <span>Пароль: demo</span>
              </div>
            </div>
          </div>
          <button className="closeModal" onClick={() => setShowLogin(false)}>×</button>
        </div>
      </div>
    );
  };

  const renderPublicExtras = () => {
    const spotlight = [...nominations].sort((a, b) => b.weight - a.weight).slice(0, 4);
    const achievementCards = [
      {
        label: "Самая активная группа",
        value: achievements?.mostActiveGroup ?? "Пока считаем",
        accent: "accent-gold",
        icon: "★",
      },
      {
        label: "Прорыв недели",
        value: achievements?.breakthrough ?? "Пока считаем",
        accent: "accent-violet",
        icon: "↗",
      },
      {
        label: "Лучшая дисциплина",
        value: achievements?.bestDiscipline ?? "Пока считаем",
        accent: "accent-blue",
        icon: "◆",
      },
      {
        label: "Командный дух",
        value: achievements?.teamSpirit ?? "Пока считаем",
        accent: "accent-green",
        icon: "∞",
      },
    ];
    const streamCards = [
      ...feed.map((item) => ({
        id: `feed-${item.id}`,
        title: "Событие",
        text: item.text,
        meta: item.time,
      })),
      ...awardedStudents.slice(0, 4).map((item) => ({
        id: `award-${item.student.id}`,
        title: "Номинации",
        text: `${item.student.fullName} получил(а) ${item.nominations.length} номинаций`,
        meta: item.student.group,
      })),
      ...spotlight.map((item) => ({
        id: `spot-${item.id}`,
        title: "Фокус номинаций",
        text: `${item.title} — одна из самых весомых номинаций`,
        meta: `Баллы ${item.weight.toFixed(2)}`,
      })),
    ];

    return (
      <>
        <section className="grid extrasIntroGrid">
          <article className="panel motivationDayPanel">
            <h2>Мотивация дня</h2>
            <p className="quote">{quote}</p>
            <button onClick={rollQuote}>Случайная мотивация</button>
          </article>
        </section>

        <section className="grid">
          <article className="panel spotlightPanel">
            <h2>Витрина номинаций</h2>
            <ul className="spotlightList">
              {spotlight.map((item, index) => (
                <li key={item.id} style={{ "--spotlight-index": index } as CSSProperties}>
                  <div className="spotlightTop">
                    <div>
                      <small>{item.type === "motivating" ? "Мотивирующая" : "Шуточная"}</small>
                      <strong>{item.title}</strong>
                    </div>
                    <span>{item.weight.toFixed(2)} балла</span>
                  </div>
                  <div className="weightTrack">
                    <div className="weightFill" style={{ width: `${Math.min(item.weight * 20, 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="panel feedPanel">
            <h2>Достижения недели</h2>
            <div className="achievements">
              {achievementCards.map((item) => (
                <article key={item.label} className={`achievementCard ${item.accent}`}>
                  <i aria-hidden="true">{item.icon}</i>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </article>
        </section>

        <section className="grid">
          {renderLuckyWheelTop()}

          <article className="panel">
            <h2>Лента событий</h2>
            <ul className="feed">
              {feed.map(item => (
                <li key={item.id}>
                  <span>{item.text}</span>
                  <time>{formatFeedDate(item)}</time>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="panel streamPanel">
          <h2>Скролл-лента активности</h2>
          <div className="streamTrack">
            <div className="streamInner">
              {streamCards.concat(streamCards).map((card, index) => (
                <article key={`${card.id}-${index}`} className="streamCard">
                  <span className="streamTag">{card.title}</span>
                  <strong>{card.text}</strong>
                  <small>{card.meta}</small>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="siteEngraving" aria-hidden="true">
          <img src={engravingBorder} alt="" />
        </section>
      </>
    );
  };

  return (
    <main className="page">
      <div className="scrollColumn scrollColumnLeft" aria-hidden="true" />
      <div className="scrollColumn scrollColumnRight" aria-hidden="true" />
      {renderHeader()}
      {renderAvatarModal()}
      {renderFullRatingModal()}
      {renderLoginModal()}
      <div className="chain-decoration chain-1"></div>
      <div className="chain-decoration chain-2"></div>
      <div className="chain-decoration chain-3"></div>
      <div className="fixedCollegeLogo fixedCollegeLogoLeft">
        <img src={brandLogo} alt="Колледж" />
      </div>
      <div className="fixedCollegeLogo fixedCollegeLogoRight">
        <img src={brandLogo} alt="Колледж" />
      </div>
      <div className="sideOrnament sideOrnamentLeft" aria-hidden="true">
        <span className="ornamentSmoke" />
        <span className="ornamentLine" />
      </div>
      <div className="sideOrnament sideOrnamentRight" aria-hidden="true">
        <span className="ornamentSmoke" />
        <span className="ornamentLine" />
      </div>

      <Routes>
        <Route
          path="/"
          element={
            <>
              <section className="reveal">{renderMetricsCards()}</section>
              <section className="reveal">
                {renderDynamicsChart()}
              </section>
              {renderAnimatedPodium()}
              <section id="public-rating" className="publicRatingSection reveal">
                {renderRatingTable()}
                {renderTopGroups()}
              </section>
              <section className="scrollBanner reveal">
                <h2>Скролль дальше: интерактив и лента событий</h2>
              </section>
              {renderNominationShowcase()}
              <section id="public-extras" className="reveal">
                {renderPublicExtras()}
              </section>
            </>
          }
        />
        <Route
          path="/student"
          element={
            auth.isAuthenticated && auth.user?.role === 'student' ? (
              <>
                <section className="grid reveal profileFirstGrid roleDashboardGrid">
                  <article className="panel studentProfilePanel">
                    <h2>Мой профиль</h2>
                    <div className="profileSection">
                      <div className="avatarUpload">
                        <div className="currentAvatar">
                          {auth.user?.avatar ? (
                            <img src={auth.user.avatar} alt="Avatar" />
                          ) : (
                            <span className="initials">{auth.user?.initials}</span>
                          )}
                        </div>
                        <div className="uploadControls">
                          <label htmlFor="avatar-upload" className="uploadBtn">
                            Загрузить аватар
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowAvatarModal(true)}
                            className="generateAvatarBtn"
                          >
                            Выбрать аватар
                          </button>
                          <input
                            id="avatar-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            style={{ display: 'none' }}
                          />
                        </div>
                      </div>
                      <div className="profileInfo">
                        <p>
                          Студент: <strong>{studentProfile?.fullName ?? "-"}</strong>
                        </p>
                        <p>Email: <strong>{auth.user?.email}</strong></p>
                        <p>Отслеживайте свой рейтинг и прокачивайте позиции в таблице.</p>
                      </div>
                    </div>
                    <div className="chips">
                      {myNominations.length ? (
                        myNominations.map((item) => (
                          <span key={item.id} className="chip">
                            {item.nominationTitle}
                          </span>
                        ))
                      ) : (
                        <span className="chip">Номинаций пока нет</span>
                      )}
                    </div>
                  </article>
                  {renderRatingTable(3)}
                </section>
                <section className="reveal">
                  {renderLuckyWheel()}
                </section>
                <section className="cards cardsCompact reveal">
                  <article className="card">
                    <span>Мое место</span>
                    <strong>#{studentProfile?.rank ?? "-"}</strong>
                  </article>
                  <article className="card">
                    <span>Мои баллы</span>
                    <strong>{studentProfile?.total ?? "-"}</strong>
                  </article>
                  <article className="card">
                    <span>Моя группа</span>
                    <strong>{studentProfile?.group ?? "-"}</strong>
                  </article>
                  <article className="card">
                    <span>Мои номинации</span>
                    <strong>{myNominations.length}</strong>
                  </article>
                </section>
              </>
            ) : (
              renderUnauthorized("студент")
            )
          }
        />
        <Route
          path="/teacher"
          element={
            auth.isAuthenticated && auth.user?.role === 'teacher' ? (
              <>
                <section className="grid reveal profileFirstGrid roleDashboardGrid">
                  <article className="panel teacherProfilePanel">
                    <h2>Мой профиль</h2>
                    <div className="profileSection">
                      <div className="avatarUpload">
                        <div className="currentAvatar">
                          {auth.user?.avatar ? (
                            <img src={auth.user.avatar} alt="Avatar" />
                          ) : (
                            <span className="initials">{auth.user?.initials}</span>
                          )}
                        </div>
                        <div className="uploadControls">
                          <label htmlFor="teacher-avatar-upload" className="uploadBtn">
                            Загрузить аватар
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowAvatarModal(true)}
                            className="generateAvatarBtn"
                          >
                            Выбрать аватар
                          </button>
                          <input
                            id="teacher-avatar-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            style={{ display: 'none' }}
                          />
                        </div>
                      </div>
                      <div className="profileInfo">
                        <p>Преподаватель: <strong>{auth.user?.fullName}</strong></p>
                        <p>Email: <strong>{auth.user?.email}</strong></p>
                        <p>В этом разделе преподаватель может управлять номинациями и баллами.</p>
                      </div>
                    </div>
                  </article>
                  {renderPointsManager()}
                </section>
                <section className="reveal">{renderNominationManager()}</section>
                <section className="reveal">{renderStudentNominationAssignment()}</section>
              </>
            ) : (
              renderUnauthorized("преподаватель")
            )
          }
        />
        <Route
          path="/admin"
          element={
            auth.isAuthenticated && auth.user?.role === 'admin' ? (
              <>
                <section className="grid reveal profileFirstGrid roleDashboardGrid">
                  <article className="panel adminProfilePanel">
                    <h2>Мой профиль</h2>
                    <div className="profileSection">
                      <div className="avatarUpload">
                        <div className="currentAvatar">
                          {auth.user?.avatar ? (
                            <img src={auth.user.avatar} alt="Avatar" />
                          ) : (
                            <span className="initials">{auth.user?.initials}</span>
                          )}
                        </div>
                      </div>
                      <div className="profileInfo">
                        <p>Админ: <strong>{auth.user?.fullName}</strong></p>
                        <p>Email: <strong>{auth.user?.email}</strong></p>
                        <p>Здесь подтверждаются заявки преподавателей на баллы и номинации.</p>
                      </div>
                    </div>
                  </article>
                  {renderAdminRequests()}
                </section>
                <section className="grid reveal">
                  {renderAdminPointsManager()}
                  {renderAdminNominations()}
                </section>
              </>
            ) : (
              renderUnauthorized("админ")
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
}

export default App;
