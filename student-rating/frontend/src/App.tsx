import { useEffect, useMemo, useState, type FormEvent } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import "./App.css";
import brandLogo from "./assets/brand-logo.png";
import api from "./api";

type RatingRow = {
  id: number;
  rank: number;
  fullName: string;
  group: string;
  total: number;
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
type Role = "guest" | "student" | "teacher";
type FeedItem = { id: number; text: string; time: string };
type StudentNomination = {
  id: number;
  studentId: number;
  nominationId: number;
  awardedAt: string;
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

const PUBLIC_FEED: FeedItem[] = [
  { id: 1, text: "Обновлен рейтинг по итогам недели", time: "10:15" },
  { id: 2, text: "Добавлена новая номинация: Командный катализатор", time: "11:40" },
  { id: 3, text: "Группа ПИ-21 вышла в лидеры по динамике", time: "13:05" },
  { id: 4, text: "Лидер дня: Иван Петров", time: "15:20" },
];

const INITIAL_STUDENT_NOMINATIONS: StudentNomination[] = [
  { id: 1, studentId: 1, nominationId: 1, awardedAt: "2026-03-28" },
  { id: 2, studentId: 1, nominationId: 8, awardedAt: "2026-03-27" },
  { id: 3, studentId: 2, nominationId: 2, awardedAt: "2026-03-28" },
  { id: 4, studentId: 3, nominationId: 5, awardedAt: "2026-03-29" },
];



function App() {
  const location = useLocation();
  const [rating, setRating] = useState<RatingRow[]>([]);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [studentNominations, setStudentNominations] = useState<StudentNomination[]>([]);
  const [availableGroups, setAvailableGroups] = useState<{ id: number; name: string }[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    studentId: INITIAL_RATING[0]?.id ?? 1,
    nominationId: INITIAL_NOMINATIONS[0]?.id ?? 1,
  });
  const [form, setForm] = useState({ title: "", type: "motivating", weight: 1 });
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [quote, setQuote] = useState(MOTIVATION_QUOTES[0]);
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
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [pointsForm, setPointsForm] = useState({ studentId: 0, points: 0, reason: "" });

  const [feed, setFeed] = useState<Array<{ id: number, text: string, time: string }>>([]);
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
    setLoading(true);
    try {
      const [ratingRes, nominationsRes, summaryRes, groupsRes] = await Promise.all([
        api.get('/students/rating'),
        api.get('/nominations'),
        api.get('/summary'),
        api.get('/groups')
      ]);
      await fetchFeedAndAchievements();
      setRating(ratingRes.data);
      setNominations(nominationsRes.data);
      setSummary(summaryRes.data);
      setAvailableGroups(groupsRes.data);
      // Для гостя studentNominations не нужны
    } catch (err) {
      console.error('Ошибка загрузки публичных данных', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [ratingRes, nominationsRes, studentNomsRes, summaryRes, groupsRes] = await Promise.all([
        api.get('/students/rating'),
        api.get('/nominations'),
        api.get('/student-nominations'),
        api.get('/summary'),
        api.get('/groups')
      ]);
      await fetchFeedAndAchievements();
      setRating(ratingRes.data);
      setNominations(nominationsRes.data);
      setStudentNominations(studentNomsRes.data);
      setSummary(summaryRes.data);
      setAvailableGroups(groupsRes.data);
    } catch (err) {
      console.error('Ошибка загрузки данных', err);
    } finally {
      setLoading(false);
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

  const groupOptions = useMemo(
    () => Array.from(new Set(rating.map((item) => item.group))),
    [rating],
  );

  const filteredRating = useMemo(() => {
    return rating.filter((row) => {
      const groupMatched = groupFilter === "all" || row.group === groupFilter;
      const query = searchQuery.trim().toLowerCase();
      const queryMatched = !query || row.fullName.toLowerCase().includes(query);
      return groupMatched && queryMatched;
    });
  }, [rating, groupFilter, searchQuery]);

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

  const topGroups = useMemo(() => {
    return dynamics
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
        percentage: ((item.value / dynamics.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1)
      }));
  }, [dynamics]);

  const chartColors = ['#7c3aed', '#a855f7', '#fbbf24', '#f59e0b', '#10b981'];

  const studentProfile = rating[0];
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
          group: student.group,
          awardedAt: entry.awardedAt,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [studentNominations, rating, nominations]);

  const awardedStudents = useMemo(() => {
    const map = new Map<number, { student: RatingRow; nominations: string[] }>();
    studentNominationRows.forEach((entry) => {
      const student = rating.find((item) => item.id === entry.studentId);
      if (!student) return;
      if (!map.has(student.id)) {
        map.set(student.id, { student, nominations: [] });
      }
      map.get(student.id)?.nominations.push(entry.nominationTitle);
    });
    return Array.from(map.values()).sort((a, b) => b.student.total - a.student.total);
  }, [studentNominationRows, rating]);

  const myNominations = useMemo(() => {
    if (!studentProfile) return [];
    return studentNominationRows.filter((item) => item.studentId === studentProfile.id);
  }, [studentNominationRows, studentProfile]);

  const createNomination = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    try {
      const res = await api.post('/nominations', {
        title: form.title.trim(),
        type: form.type,
        weight: Number(form.weight)
      });
      // Добавляем новую номинацию в состояние
      setNominations(prev => [...prev, res.data]);
      setForm({ title: "", type: "motivating", weight: 1 });
    } catch (err) {
      alert('Ошибка создания номинации');
    }
  };

  const removeNomination = async (id: number) => {
    try {
      await api.delete(`/nominations/${id}`);
      setNominations(prev => prev.filter(item => item.id !== id));
      // Также удаляем связанные назначения
      setStudentNominations(prev => prev.filter(item => item.nominationId !== id));
    } catch (err) {
      alert('Ошибка удаления номинации');
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
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      setAuth({ user, isAuthenticated: true });
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
        localStorage.setItem("demo-user", JSON.stringify(updatedUser));
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
      localStorage.setItem("demo-user", JSON.stringify(updatedUser));
      setShowAvatarModal(false);
    }
  };

  const addPointsToStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await api.post('/students/points', {
        studentId: pointsForm.studentId,
        points: pointsForm.points
      });
      const ratingRes = await api.get('/students/rating');
      setRating(ratingRes.data);
      await fetchFeedAndAchievements(); // <-- добавить
      setPointsForm({ studentId: 0, points: 0, reason: "" });
    } catch (err) {
      alert('Ошибка начисления баллов');
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

  const renderHeader = () => (
    <header className="header">
      <div className="headerTop">
        <span className={`badge ${scrolled ? 'scrolled' : ''}`}>
          {auth.user ? (
            <div className="avatarContainer">
              <div className="userAvatar">
                {auth.user.avatar ? (
                  <img src={auth.user.avatar} alt="Avatar" />
                ) : (
                  <span className="initials">{auth.user.initials}</span>
                )}
              </div>
              <span className="avatarInitials">{auth.user.initials}</span>
            </div>
          ) : (
            <img src={brandLogo} alt="Логотип проекта" />
          )}
        </span>
        <div className="authSection">
          {auth.isAuthenticated ? (
            <button onClick={logout} className="logoutBtn">Выйти</button>
          ) : (
            <button onClick={() => setShowLogin(true)} className="loginBtn">Войти</button>
          )}
          <button onClick={toggleTheme} className="themeToggleBtn">
            {theme === 'dark' ? '☀️' : '🌙️'}
          </button>
        </div>
      </div>
      {auth.isAuthenticated && (
        <div className="userWelcome">
          <span className="welcomeText">Добро пожаловать, {auth.user?.fullName}!</span>
        </div>
      )}
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
      <article className="card">
        <span>Лидер периода</span>
        <strong>{summaryData.topStudent.fullName}</strong>
      </article>
    </section>
  );

  const renderRatingTable = () => (
    <article className="panel">
      <h2>Публичный рейтинг</h2>
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Место</th>
              <th>Студент</th>
              <th>Группа</th>
              <th>Баллы</th>
            </tr>
          </thead>
          <tbody>
            {filteredRating.map((row) => (
              <tr key={row.id}>
                <td>{row.rank}</td>
                <td>{row.fullName}</td>
                <td>{row.group}</td>
                <td>{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );

  const TrophyIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="trophyIcon">
      <path d="M12 2L14.5 8.5L19 9L15 13L14 19L12 17L10 19L5 13L0.5 8.5L5 2L12 2Z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
      <circle cx="12" cy="8" r="2" fill="#fff" />
    </svg>
  );

  const renderDynamicsChart = () => (
    <article className="panel">
      <h2>Динамика по группам</h2>
      <div className="chartContainer">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dynamics}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis
              dataKey="group"
              stroke="#a855f7"
              tick={{ fill: '#d6d2e3' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke="#a855f7"
              tick={{ fill: '#d6d2e3' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(26, 26, 46, 0.9)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {dynamics.map((_, index) => (
                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );

  const renderTopGroups = () => (
    <article className="panel">
      <h2>🏆 Топ групп</h2>
      <div className="topGroupsGrid">
        {topGroups.map((group, index) => (
          <div key={group.group} className="topGroupCard">
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
          </div>
        ))}
      </div>
    </article>
  );

  const renderNominationManager = () => (
    <section className="grid">
      <article className="panel">
        <h2>Добавить номинацию</h2>
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
            value={form.weight}
            onChange={(e) => setForm((old) => ({ ...old, weight: Number(e.target.value) }))}
          />
          <button type="submit">Добавить</button>
        </form>
      </article>

      <article className="panel">
        <h2>Список номинаций</h2>
        <ul className="nominationList">
          {nominations.map((nomination) => (
            <li key={nomination.id}>
              <div>
                <strong>{nomination.title}</strong>
                <span>
                  {nomination.type === "motivating" ? "Мотивирующая" : "Шуточная"} | Вес:{" "}
                  {nomination.weight}
                </span>
              </div>
              <button onClick={() => removeNomination(nomination.id)}>Удалить</button>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );

  const renderStudentNominationAssignment = () => (
    <section className="grid">
      <article className="panel">
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

      <article className="panel">
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
    <article className="panel">
      <h2>Начисление баллов студентам</h2>
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
          min="1"
        />
        <input
          type="text"
          placeholder="Причина начисления"
          value={pointsForm.reason}
          onChange={(e) => setPointsForm(old => ({ ...old, reason: e.target.value }))}
          required
        />
        <button type="submit">
          Начислить баллы
        </button>
      </form>
    </article>
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

  const renderLoginModal = () => {
    if (!showLogin) return null;

    return (
      <div className="modalOverlay" onClick={() => setShowLogin(false)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
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
              <p><strong>Студент:</strong></p>
              <p>Email: ivan@student.edu</p>
              <p>Пароль: demo</p>
              <br />
              <p><strong>Преподаватель:</strong></p>
              <p>Email: alexey@teacher.edu</p>
              <p>Пароль: demo</p>
            </div>
          </div>
          <button className="closeModal" onClick={() => setShowLogin(false)}>×</button>
        </div>
      </div>
    );
  };

  const renderPublicExtras = () => {
    const podium = filteredRating.slice(0, 3);
    const spotlight = [...nominations].sort((a, b) => b.weight - a.weight).slice(0, 4);
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
        title: "Spotlight",
        text: `${item.title} — одна из самых весомых номинаций`,
        meta: `Вес ${item.weight.toFixed(2)}`,
      })),
    ];

    return (
      <>
        <section className="grid">
          <article className="panel">
            <h2>Быстрые фильтры</h2>
            <div className="filters">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Поиск студента по имени"
              />
              <select
                value={groupFilter}
                onChange={(event) => setGroupFilter(event.target.value)}
              >
                <option value="all">Все группы</option>
                {groupOptions.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>
            <p>
              Показано студентов: <strong>{filteredRating.length}</strong>
            </p>
          </article>

          <article className="panel">
            <h2>Мотивация дня</h2>
            <p className="quote">{quote}</p>
            <button onClick={rollQuote}>Случайная мотивация</button>
          </article>
        </section>

        <section className="grid">
          <article className="panel">
            <h2>Подиум топ-3</h2>
            <div className="podium">
              {podium.map((row, index) => (
                <div key={row.fullName} className="podiumItem">
                  <span className="medal">{index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}</span>
                  <strong>{row.fullName}</strong>
                  <span>{row.total} баллов</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <h2>Spotlight номинаций</h2>
            <ul className="spotlightList">
              {spotlight.map((item) => (
                <li key={item.id}>
                  <div className="spotlightTop">
                    <strong>{item.title}</strong>
                    <span>{item.weight.toFixed(2)}</span>
                  </div>
                  <div className="weightTrack">
                    <div className="weightFill" style={{ width: `${Math.min(item.weight * 20, 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="grid">
          <article className="panel">
            <h2>Лента событий</h2>
            <ul className="feed">
              {feed.map(item => (
                <li key={item.id}>
                  <span>{item.text}</span>
                  <time>{item.time}</time>
                </li>
              ))}
            </ul>
          </article>

          <article className="panel">
            <h2>Достижения недели</h2>
            <div className="achievements">
              <span>🔥 Самая активная группа: {achievements?.mostActiveGroup}</span>
              <span>🚀 Прорыв недели: {achievements?.breakthrough}</span>
              <span>📚 Лучшая дисциплина по баллам: {achievements?.bestDiscipline}</span>
              <span>🤝 Командный дух: {achievements?.teamSpirit}</span>
            </div>
          </article>
        </section>

        <section className="grid">
          <article className="panel">
            <h2>Студенты с номинациями</h2>
            <ul className="awardedStudents">
              {awardedStudents.map((item) => (
                <li key={item.student.id}>
                  <div>
                    <strong>
                      {item.student.fullName} ({item.student.group})
                    </strong>
                    <span>{item.student.total} баллов</span>
                  </div>
                  <div className="chips">
                    {item.nominations.map((nomination, index) => (
                      <span key={`${item.student.id}-${index}`} className="chip">
                        {nomination}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="panel">
            <h2>Топ по полученным номинациям</h2>
            <div className="achievements">
              {awardedStudents.slice(0, 4).map((item) => (
                <span key={`top-${item.student.id}`}>
                  {item.student.fullName}: {item.nominations.length} ном.
                </span>
              ))}
            </div>
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
      </>
    );
  };

  return (
    <main className="page">
      {renderHeader()}
      {renderAvatarModal()}
      {renderLoginModal()}
      <div className="chain-decoration chain-1"></div>
      <div className="chain-decoration chain-2"></div>
      <div className="chain-decoration chain-3"></div>
      <div className="fixedCollegeLogo">
        <img src={brandLogo} alt="Колледж" />
      </div>

      <Routes>
        <Route
          path="/"
          element={
            <>
              <section className="reveal">{renderMetricsCards()}</section>
              <section id="public-rating" className="grid reveal">
                {renderRatingTable()}
                {renderDynamicsChart()}
              </section>
              <section className="scrollBanner reveal">
                <h2>Скролль дальше: интерактив, топ групп и лента событий</h2>
              </section>
              <section id="public-extras" className="reveal">
                {renderTopGroups()}
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
                <section className="grid reveal">
                  <article className="panel">
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
                  {renderRatingTable()}
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
                <section className="reveal">{renderMetricsCards()}</section>
                <section className="grid reveal">
                  {renderDynamicsChart()}
                  {renderPointsManager()}
                  <article className="panel">
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
                        <p>В этом разделе преподаватель может управлять номинациями и весами.</p>
                        <p>Изменения сразу видны на фронтенде для демонстрации.</p>
                      </div>
                    </div>
                  </article>
                </section>
                <section className="reveal">{renderNominationManager()}</section>
                <section className="reveal">{renderStudentNominationAssignment()}</section>
              </>
            ) : (
              renderUnauthorized("преподаватель")
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
}

export default App;
