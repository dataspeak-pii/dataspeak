import { Feather } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { adaptQueryResponse } from "../../src/adapter";
import { ApiError, postQuery } from "../../src/api";
import {
  clearSession,
  getSession,
  loadHistoryForEmail,
  mockForgotPassword,
  mockLogin,
  mockRegister,
  saveHistoryForEmail,
  type Session,
} from "../../src/auth";
import { getTenantFromEmail, type Tenant } from "../../src/tenants";
import type { AnalysisResult, QueryHistoryItem, QueryStatus } from "../../src/types";

type ScreenView = "home" | "login" | "register" | "forgot" | "account";
type ResultTab = "interpretation" | "script" | "data";

const animatedExamples = [
  "volume de produção dos últimos 3 meses",
  "estoque atual por material",
  "top 10 material",
  "ordens de fabricação",
  "pedidos de compra por fornecedor",
];

const suggestions = [
  "Produção realizada vs planejada nos últimos 3 meses",
  "Top 10 materiais por receita de faturamento",
  "Estoque por depósito abaixo do mínimo",
  "Pedidos de compra por fornecedor e valor comprometido",
  "Faturamento mensal por cliente no 1º trimestre",
  "Ordens de produção em aberto com atraso",
];

const infoPills: { icon: keyof typeof Feather.glyphMap; text: string }[] = [
  { icon: "database", text: "16 Tabelas · 130 Campos SAP" },
  { icon: "bar-chart-2", text: "Visualização automática" },
  { icon: "trending-up", text: "Análise em segundos" },
];

export default function HomeScreen() {
  const [isDark, setIsDark] = useState(true);
  const [view, setView] = useState<ScreenView>("home");
  const [session, setSession] = useState<Session | null>(null);

  const [question, setQuestion] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [status, setStatus] = useState<QueryStatus>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<ResultTab>("interpretation");

  const [successMessage, setSuccessMessage] = useState("");

  const [exampleIndex, setExampleIndex] = useState(0);
  const [exampleText, setExampleText] = useState("");
  const [isDeletingExample, setIsDeletingExample] = useState(false);

  const themeProgress = useRef(new Animated.Value(1)).current;
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const drawerTranslate = useRef(new Animated.Value(-320)).current;

  const currentTheme = isDark ? darkTheme : lightTheme;
  const isLoading = status === "loading";

  useEffect(() => {
    getSession().then((savedSession) => {
      if (savedSession) {
        setSession(savedSession);
        loadHistoryForEmail(savedSession.email).then(setHistory);
      }
    });
  }, []);

  useEffect(() => {
    Animated.timing(themeProgress, {
      toValue: isDark ? 1 : 0,
      duration: 420,
      useNativeDriver: false,
    }).start();
  }, [isDark, themeProgress]);

  useEffect(() => {
    Animated.timing(drawerTranslate, {
      toValue: isHistoryOpen ? 0 : -320,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [isHistoryOpen, drawerTranslate]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [cursorOpacity]);

  useEffect(() => {
    const currentExample = animatedExamples[exampleIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeletingExample && exampleText.length < currentExample.length) {
      timeout = setTimeout(() => {
        setExampleText(currentExample.slice(0, exampleText.length + 1));
      }, 55);
    } else if (!isDeletingExample && exampleText.length === currentExample.length) {
      timeout = setTimeout(() => setIsDeletingExample(true), 1400);
    } else if (isDeletingExample && exampleText.length > 0) {
      timeout = setTimeout(() => {
        setExampleText(currentExample.slice(0, exampleText.length - 1));
      }, 28);
    } else if (isDeletingExample && exampleText.length === 0) {
      timeout = setTimeout(() => {
        setIsDeletingExample(false);
        setExampleIndex((currentIndex) => (currentIndex + 1) % animatedExamples.length);
      }, 300);
    }

    return () => clearTimeout(timeout);
  }, [exampleText, exampleIndex, isDeletingExample]);

  const animatedBackground = themeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [lightTheme.background, darkTheme.background],
  });

  const animatedInputBackground = themeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [lightTheme.inputBackground, darkTheme.inputBackground],
  });

  const animatedBorder = themeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [lightTheme.border, darkTheme.border],
  });

  const animatedIconRotation = themeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  function handleToggleTheme() {
    setIsDark((currentValue) => !currentValue);
  }

  function handleSuggestionPress(suggestion: string) {
    setQuestion(suggestion);
  }

  async function handleGenerate() {
    const cleanedQuestion = question.trim();
    if (!cleanedQuestion || isLoading) return;

    setStatus("loading");
    setErrorMessage(null);
    setResult(null);
    setActiveTab("interpretation");

    try {
      const apiResponse = await postQuery({ question: cleanedQuestion });
      const id = `q-${Date.now()}`;
      const adapted = adaptQueryResponse(apiResponse, cleanedQuestion, id);

      setResult(adapted);
      setStatus("done");

      const nextHistory = [
        {
          id,
          question: cleanedQuestion,
          timestamp: new Date().toISOString(),
          status: "done" as QueryStatus,
          category: adapted.interpretation.category ?? "Análise",
          result: adapted,
        },
        ...history,
      ].slice(0, 20);

      setHistory(nextHistory);

      if (session) {
        await saveHistoryForEmail(session.email, nextHistory);
      }
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Erro inesperado ao processar a pergunta.";

      setErrorMessage(message);
      setStatus("error");
    }
  }

  function restoreFromHistory(item: QueryHistoryItem) {
    if (item.result) {
      setResult(item.result);
      setQuestion(item.question);
      setStatus("done");
      setErrorMessage(null);
      setActiveTab("interpretation");
      setIsHistoryOpen(false);
      setView("home");
      return;
    }

    setQuestion(item.question);
    setIsHistoryOpen(false);
    setView("home");
  }

  async function handleLoginSuccess(newSession: Session) {
    setSession(newSession);
    setView("home");
    setSuccessMessage("");
    const savedHistory = await loadHistoryForEmail(newSession.email);
    setHistory(savedHistory);
  }

  async function handleLogout() {
    await clearSession();
    setSession(null);
    setHistory([]);
    setResult(null);
    setQuestion("");
    setStatus("idle");
    setView("home");
  }

  function goToAccountOrLogin() {
    setSuccessMessage("");
    setView(session ? "account" : "login");
  }

  return (
    <Animated.View style={[styles.screen, { backgroundColor: animatedBackground }]}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.screen}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TopBar
            isDark={isDark}
            theme={currentTheme}
            animatedIconRotation={animatedIconRotation}
            onToggleTheme={handleToggleTheme}
            onLogin={() => { setSuccessMessage(""); setView("login"); }}
            onRegister={() => { setSuccessMessage(""); setView("register"); }}
            onAccount={() => setView("account")}
            onLogoPress={() => setView("home")}
            session={session}
          />

        {view === "home" && (
          <>
            <ScrollView
              contentContainerStyle={styles.container}
              keyboardShouldPersistTaps="handled"
            >
              <Pressable
                style={[
                  styles.historyFloatingButton,
                  {
                    borderColor: currentTheme.border,
                    backgroundColor: currentTheme.floatingButtonBackground,
                  },
                ]}
                onPress={() => setIsHistoryOpen(true)}
              >
                <Feather name="sidebar" size={18} color={currentTheme.text} />
              </Pressable>

              <View style={styles.content}>
                <Text style={[styles.title, { color: currentTheme.text }]}>
                  O que você quer analisar hoje?
                </Text>

                <Text style={[styles.subtitle, { color: currentTheme.muted }]}>
                  Traduza perguntas em linguagem natural para análises visuais dos seus
                  dados SAP — sem SQL, sem esperas.
                </Text>

                <View style={styles.exampleRow}>
                  <Text style={[styles.examplePrefix, { color: currentTheme.muted }]}>
                    Ex:
                  </Text>

                  <Text style={[styles.example, { color: currentTheme.primary }]}>
                    {exampleText}
                  </Text>

                  <Animated.Text
                    style={[
                      styles.cursor,
                      { color: currentTheme.primary, opacity: cursorOpacity },
                    ]}
                  >
                    |
                  </Animated.Text>
                </View>

                <Animated.View
                  style={[
                    styles.questionBox,
                    {
                      backgroundColor: animatedInputBackground,
                      borderColor: animatedBorder,
                    },
                  ]}
                >
                  <TextInput
                    value={question}
                    onChangeText={setQuestion}
                    multiline
                    placeholder="Descreva o que você quer analisar... Ex: volume de produção dos últimos 3 meses"
                    placeholderTextColor={currentTheme.muted}
                    style={[styles.input, { color: currentTheme.text }]}
                    textAlignVertical="top"
                    editable={!isLoading}
                  />

                  <Animated.View style={[styles.questionFooter, { borderTopColor: animatedBorder }]}>
                    <Text style={[styles.hint, { color: currentTheme.muted }]}>
                      Toque em gerar para enviar
                    </Text>

                    <Pressable
                      onPress={handleGenerate}
                      disabled={isLoading || !question.trim()}
                      style={[
                        styles.generateButton,
                        {
                          backgroundColor: currentTheme.buttonBackground,
                          borderColor: currentTheme.border,
                          opacity: isLoading || !question.trim() ? 0.55 : 1,
                        },
                      ]}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color={currentTheme.text} />
                      ) : (
                        <Text style={[styles.generateButtonText, { color: currentTheme.text }]}>
                          ↑ Gerar análise
                        </Text>
                      )}
                    </Pressable>
                  </Animated.View>
                </Animated.View>

                {status === "error" && (
                  <View
                    style={[
                      styles.errorBox,
                      {
                        backgroundColor: currentTheme.errorBackground,
                        borderColor: currentTheme.errorBorder,
                      },
                    ]}
                  >
                    <Feather name="alert-triangle" size={18} color={currentTheme.errorText} />
                    <Text style={[styles.errorText, { color: currentTheme.errorText }]}>
                      {errorMessage}
                    </Text>
                  </View>
                )}

                <View style={styles.suggestionsHeader}>
                  <Text style={[styles.suggestionsIcon, { color: currentTheme.muted }]}>↵</Text>
                  <Text style={[styles.suggestionsTitle, { color: currentTheme.muted }]}>
                    Sugestões rápidas — clique para usar
                  </Text>
                </View>

                <View style={styles.suggestions}>
                  {suggestions.map((item) => (
                    <Pressable
                      key={item}
                      onPress={() => handleSuggestionPress(item)}
                      style={[
                        styles.suggestionPill,
                        {
                          backgroundColor: currentTheme.pillBackground,
                          borderColor: currentTheme.border,
                        },
                      ]}
                    >
                      <Text style={[styles.suggestionText, { color: currentTheme.text }]}>
                        {item}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.infoRow}>
                  {infoPills.map((item) => (
                    <InfoPill
                      key={item.text}
                      icon={item.icon}
                      text={item.text}
                      theme={currentTheme}
                    />
                  ))}
                </View>

                {result && (
                  <AnalysisResultView
                    result={result}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    theme={currentTheme}
                  />
                )}
              </View>
            </ScrollView>

            <HistoryDrawer
              isOpen={isHistoryOpen}
              drawerTranslate={drawerTranslate}
              theme={currentTheme}
              history={history}
              onClose={() => setIsHistoryOpen(false)}
              onSelect={restoreFromHistory}
            />
          </>
        )}

        {view === "login" && (
          <AuthShell theme={currentTheme} onBack={() => setView("home")}>
            <LoginFormMobile
              theme={currentTheme}
              successMessage={successMessage}
              onLoginSuccess={handleLoginSuccess}
              onRegister={() => {
                setSuccessMessage("");
                setView("register");
              }}
              onForgot={() => setView("forgot")}
            />
          </AuthShell>
        )}

        {view === "register" && (
          <AuthShell theme={currentTheme} onBack={() => setView("login")} showBackButton={false}>
            <RegisterFormMobile
              theme={currentTheme}
              onBack={() => setView("login")}
              onSuccess={(tenantName) => {
                setSuccessMessage(`Conta criada com sucesso em ${tenantName}! Faça login para continuar.`);
                setView("login");
              }}
            />
          </AuthShell>
        )}

        {view === "forgot" && (
          <AuthShell theme={currentTheme} onBack={() => setView("login")}>
            <ForgotPasswordFormMobile
              theme={currentTheme}
              onBack={() => setView("login")}
            />
          </AuthShell>
        )}

        {view === "account" && (
          <AccountScreen
            theme={currentTheme}
            session={session}
            history={history}
            onBack={() => setView("home")}
            onLogout={handleLogout}
          />
        )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Animated.View>
  );
}

function TopBar({
  isDark,
  theme,
  animatedIconRotation,
  onToggleTheme,
  onLogin,
  onRegister,
  onAccount,
  onLogoPress,
  session,
}: {
  isDark: boolean;
  theme: typeof darkTheme;
  animatedIconRotation: Animated.AnimatedInterpolation<string | number>;
  onToggleTheme: () => void;
  onLogin: () => void;
  onRegister: () => void;
  onAccount: () => void;
  onLogoPress: () => void;
  session: Session | null;
}) {
  return (
    <View
      style={[
        styles.fixedTopBar,
        {
          borderBottomColor: theme.border,
          backgroundColor: theme.background,
        },
      ]}
    >
      <Pressable onPress={onLogoPress}>
        <Image
          source={
            isDark
              ? require("../../assets/images/logo-white.png")
              : require("../../assets/images/logo.png")
          }
          style={styles.topLogo}
          resizeMode="contain"
        />
      </Pressable>

      <View style={styles.topActions}>
        <Pressable style={styles.themeIconButton} onPress={onToggleTheme}>
          <Animated.View style={{ transform: [{ rotate: animatedIconRotation }] }}>
            <View style={{ transform: [{ rotate: isDark ? "-100deg" : "0deg" }] }}>
              <Feather name={isDark ? "moon" : "sun"} size={21} color={theme.text} />
            </View>
          </Animated.View>
        </Pressable>

        {session ? (
          <Pressable
            style={[styles.accountButton, { borderColor: theme.border }]}
            onPress={onAccount}
          >
            <Feather name="user" size={13} color={theme.text} />
            <Text style={[styles.accountText, { color: theme.text }]}>
              Minha Conta
            </Text>
          </Pressable>
        ) : (
          <>
            <Pressable style={styles.loginTextButton} onPress={onLogin}>
              <Text style={[styles.loginText, { color: theme.text }]}>Entrar</Text>
            </Pressable>

            <Pressable style={styles.createAccountButton} onPress={onRegister}>
              <Text style={styles.createAccountText}>Criar conta</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function AuthShell({
  children,
  theme,
  onBack,
  showBackButton = true,
}: {
  children: ReactNode;
  theme: typeof darkTheme;
  onBack: () => void;
  showBackButton?: boolean;
}) {
  return (
    <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
      {showBackButton ? (
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={[styles.backText, { color: theme.muted }]}>← Voltar ao início</Text>
      </Pressable>
      ) : null}

      <View
        style={[
          styles.authCard,
          {
            backgroundColor: theme.pillBackground,
            borderColor: theme.border,
          },
        ]}
      >
        {children}
      </View>
    </ScrollView>
  );
}

function TenantBadgeMobile({ tenant, theme }: { tenant: Tenant | null; theme: typeof darkTheme }) {
  if (!tenant) {
    return (
      <View style={[styles.tenantBadge, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
        <Feather name="briefcase" size={14} color={theme.muted} />
        <Text style={[styles.tenantText, { color: theme.muted }]}>
          Domínio corporativo não identificado
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.tenantBadge, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
      <View style={[styles.tenantLogo, { backgroundColor: tenant.primaryColor }]}>
        <Text style={styles.tenantLogoText}>{tenant.logo}</Text>
      </View>
      <View style={styles.tenantInfo}>
        <Text style={[styles.tenantName, { color: theme.text }]}>{tenant.name}</Text>
        <Text style={[styles.tenantText, { color: theme.muted }]}>
          {tenant.industry} · {tenant.domain}
        </Text>
      </View>
    </View>
  );
}

function LoginFormMobile({
  theme,
  successMessage,
  onLoginSuccess,
  onRegister,
  onForgot,
}: {
  theme: typeof darkTheme;
  successMessage: string;
  onLoginSuccess: (session: Session) => void;
  onRegister: () => void;
  onForgot: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tenant = getTenantFromEmail(email);

  async function handleSubmit() {
    setError("");

    if (!email.trim()) {
      setError("Informe seu e-mail.");
      return;
    }

    if (!password) {
      setError("Informe sua senha.");
      return;
    }

    setLoading(true);

    try {
      const loggedSession = await mockLogin(email, password);
      onLoginSuccess(loggedSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      <Text style={[styles.authTitle, { color: theme.text }]}>Entrar</Text>
      <Text style={[styles.authSubtitle, { color: theme.muted }]}>
        Acesse sua conta corporativa para continuar.
      </Text>

      <TenantBadgeMobile tenant={tenant} theme={theme} />

      {successMessage ? (
        <View style={[styles.successBox, { borderColor: theme.successBorder, backgroundColor: theme.successBackground }]}>
          <Text style={[styles.successText, { color: theme.successText }]}>{successMessage}</Text>
        </View>
      ) : null}

      {error ? <ErrorMessage theme={theme} message={error} /> : null}

      <FieldLabel theme={theme} label="E-mail corporativo" />
      <InputShell theme={theme} icon="mail">
        <TextInput
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setError("");
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="voce@suaempresa.com"
          placeholderTextColor={theme.muted}
          style={[styles.authInput, { color: theme.text }]}
        />
      </InputShell>

      <FieldLabel theme={theme} label="Senha" />
      <InputShell theme={theme} icon="lock">
        <TextInput
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setError("");
          }}
          secureTextEntry={!showPassword}
          placeholder="Sua senha"
          placeholderTextColor={theme.muted}
          style={[styles.authInput, { color: theme.text }]}
        />
        <Pressable onPress={() => setShowPassword((current) => !current)}>
          <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={theme.muted} />
        </Pressable>
      </InputShell>

      <Pressable onPress={onForgot} style={styles.forgotButton}>
        <Text style={[styles.linkText, { color: theme.primary }]}>Esqueci minha senha</Text>
      </Pressable>

      <PrimaryButton
        theme={theme}
        label={loading ? "Entrando..." : "Entrar"}
        loading={loading}
        onPress={handleSubmit}
      />

      <View style={styles.authFooterRow}>
        <Text style={[styles.authFooterText, { color: theme.muted }]}>Ainda não tem conta?</Text>
        <Pressable onPress={onRegister}>
          <Text style={[styles.linkText, { color: theme.primary }]}>Criar conta</Text>
        </Pressable>
      </View>

      <View style={[styles.authDivider, { backgroundColor: theme.border }]} />

      <Text style={[styles.domainHint, { color: theme.muted }]}>
        Domínios para teste: dataspeak.com.br · demo.com · empresaa.com
      </Text>
    </View>
  );
}

function RegisterFormMobile({
  theme,
  onBack,
  onSuccess,
}: {
  theme: typeof darkTheme;
  onBack: () => void;
  onSuccess: (tenantName: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tenant = getTenantFromEmail(email);

  async function handleSubmit() {
    setError("");

    if (!name.trim()) {
      setError("Informe seu nome.");
      return;
    }

    if (!email.trim()) {
      setError("Informe seu e-mail.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const response = await mockRegister(name, email, password);
      onSuccess(response.tenant.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      <Pressable onPress={onBack} style={styles.inlineBackButton}>
        <Text style={[styles.backText, { color: theme.muted }]}>← Voltar ao login</Text>
      </Pressable>

      <Text style={[styles.authTitle, { color: theme.text }]}>Criar conta</Text>
      <Text style={[styles.authSubtitle, { color: theme.muted }]}>
        Use seu e-mail corporativo para identificar sua empresa.
      </Text>

      <TenantBadgeMobile tenant={tenant} theme={theme} />

      {error ? <ErrorMessage theme={theme} message={error} /> : null}

      <FieldLabel theme={theme} label="Nome completo" />
      <InputShell theme={theme} icon="user">
        <TextInput
          value={name}
          onChangeText={(value) => {
            setName(value);
            setError("");
          }}
          placeholder="Seu nome"
          placeholderTextColor={theme.muted}
          style={[styles.authInput, { color: theme.text }]}
        />
      </InputShell>

      <FieldLabel theme={theme} label="E-mail corporativo" />
      <InputShell theme={theme} icon="mail">
        <TextInput
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setError("");
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="voce@suaempresa.com"
          placeholderTextColor={theme.muted}
          style={[styles.authInput, { color: theme.text }]}
        />
      </InputShell>

      <FieldLabel theme={theme} label="Senha" />
      <InputShell theme={theme} icon="lock">
        <TextInput
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setError("");
          }}
          secureTextEntry={!showPassword}
          placeholder="Mínimo 6 caracteres"
          placeholderTextColor={theme.muted}
          style={[styles.authInput, { color: theme.text }]}
        />
        <Pressable onPress={() => setShowPassword((current) => !current)}>
          <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={theme.muted} />
        </Pressable>
      </InputShell>

      <FieldLabel theme={theme} label="Confirmar senha" />
      <InputShell theme={theme} icon="lock">
        <TextInput
          value={confirm}
          onChangeText={(value) => {
            setConfirm(value);
            setError("");
          }}
          secureTextEntry={!showPassword}
          placeholder="Repita a senha"
          placeholderTextColor={theme.muted}
          style={[styles.authInput, { color: theme.text }]}
        />
      </InputShell>

      <PrimaryButton
        theme={theme}
        label={loading ? "Criando conta..." : "Criar conta"}
        loading={loading}
        onPress={handleSubmit}
      />
    </View>
  );
}

function ForgotPasswordFormMobile({
  theme,
  onBack,
}: {
  theme: typeof darkTheme;
  onBack: () => void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [successEmail, setSuccessEmail] = useState("");
  const [error, setError] = useState("");

  const tenant = getTenantFromEmail(email);

  async function handleSubmit() {
    setError("");

    if (!email.trim()) {
      setError("Informe seu e-mail.");
      return;
    }

    setLoading(true);

    try {
      const response = await mockForgotPassword(email);
      setSuccessEmail(response.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar.");
    } finally {
      setLoading(false);
    }
  }

  if (successEmail) {
    return (
      <View style={styles.successCenter}>
        <View style={[styles.successIcon, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
          <Feather name="send" size={22} color={theme.primary} />
        </View>

        <Text style={[styles.authTitle, { color: theme.text, textAlign: "center" }]}>E-mail enviado!</Text>
        <Text style={[styles.authSubtitle, { color: theme.muted, textAlign: "center" }]}>
          Enviamos as instruções para:
        </Text>
        <Text style={[styles.successEmail, { color: theme.text }]}>{successEmail}</Text>

        <View style={[styles.infoNotice, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
          <Text style={[styles.infoNoticeText, { color: theme.muted }]}>
            Em um sistema real, você receberia o link de redefinição por e-mail.
          </Text>
        </View>

        <Pressable onPress={onBack}>
          <Text style={[styles.linkText, { color: theme.primary }]}>← Voltar ao login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <Pressable onPress={onBack} style={styles.inlineBackButton}>
        <Text style={[styles.backText, { color: theme.muted }]}>← Voltar ao login</Text>
      </Pressable>

      <Text style={[styles.authTitle, { color: theme.text }]}>Esqueci minha senha</Text>
      <Text style={[styles.authSubtitle, { color: theme.muted }]}>
        Informe seu e-mail corporativo.
      </Text>

      <TenantBadgeMobile tenant={tenant} theme={theme} />

      {error ? <ErrorMessage theme={theme} message={error} /> : null}

      <FieldLabel theme={theme} label="E-mail corporativo" />
      <InputShell theme={theme} icon="mail">
        <TextInput
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setError("");
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="voce@suaempresa.com"
          placeholderTextColor={theme.muted}
          style={[styles.authInput, { color: theme.text }]}
        />
      </InputShell>

      <PrimaryButton
        theme={theme}
        label={loading ? "Enviando..." : "Enviar instruções"}
        loading={loading}
        onPress={handleSubmit}
      />
    </View>
  );
}

function AccountScreen({
  theme,
  session,
  history,
  onBack,
  onLogout,
}: {
  theme: typeof darkTheme;
  session: Session | null;
  history: QueryHistoryItem[];
  onBack: () => void;
  onLogout: () => void;
}) {
  if (!session) {
    return (
      <AuthShell theme={theme} onBack={onBack}>
        <Text style={[styles.authTitle, { color: theme.text }]}>Sessão não encontrada</Text>
        <Text style={[styles.authSubtitle, { color: theme.muted }]}>
          Entre na sua conta para acessar esta área.
        </Text>
      </AuthShell>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.accountContainer}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={[styles.backText, { color: theme.muted }]}>← Voltar ao início</Text>
      </Pressable>

      <Text style={[styles.accountTitle, { color: theme.text }]}>Minha Conta</Text>
      <Text style={[styles.accountSubtitle, { color: theme.muted }]}>
        Gerencie suas informações e histórico de análises.
      </Text>

      <View style={[styles.accountCard, { borderColor: theme.border, backgroundColor: theme.pillBackground }]}>
        <View style={styles.accountUserRow}>
          <View style={[styles.accountAvatar, { backgroundColor: theme.primary }]}>
            <Feather name="user" size={22} color="#FFFFFF" />
          </View>

          <View style={styles.accountUserInfo}>
            <Text style={[styles.accountName, { color: theme.text }]}>{session.name}</Text>
            <Text style={[styles.accountMeta, { color: theme.muted }]}>
              Membro desde {new Date(session.loginAt).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </Text>
          </View>
        </View>

        <View style={[styles.accountDivider, { backgroundColor: theme.border }]} />

        <View style={styles.accountInfoRow}>
          <Feather name="mail" size={16} color={theme.muted} />
          <Text style={[styles.accountInfoText, { color: theme.text }]}>{session.email}</Text>
        </View>

        <View style={styles.accountInfoRow}>
          <Feather name="briefcase" size={16} color={theme.muted} />
          <Text style={[styles.accountInfoText, { color: theme.text }]}>{session.tenant.name}</Text>
        </View>
      </View>

      <View style={styles.accountSectionHeader}>
        <Feather name="message-square" size={16} color={theme.muted} />
        <Text style={[styles.accountSectionTitle, { color: theme.text }]}>Histórico de análises</Text>
        <Text style={[styles.accountHistoryCount, { color: theme.muted }]}>
          {history.length} {history.length === 1 ? "consulta" : "consultas"}
        </Text>
      </View>

      {history.length === 0 ? (
        <View style={[styles.accountCard, { borderColor: theme.border, backgroundColor: theme.pillBackground }]}>
          <Text style={[styles.emptyHistory, { color: theme.muted }]}>
            Nenhuma consulta realizada ainda.
          </Text>
          <Pressable onPress={onBack}>
            <Text style={[styles.linkText, { color: theme.primary, textAlign: "center", marginTop: 12 }]}>
              Fazer minha primeira análise →
            </Text>
          </Pressable>
        </View>
      ) : (
        history.map((item) => (
          <View
            key={item.id}
            style={[styles.accountHistoryItem, { borderColor: theme.border, backgroundColor: theme.pillBackground }]}
          >
            <Text style={[styles.historyItemText, { color: theme.text }]}>{item.question}</Text>
            <View style={styles.accountHistoryMetaRow}>
              <Text style={[styles.accountHistoryCategory, { color: theme.primary }]}>{item.category}</Text>
              <Text style={[styles.historyMeta, { color: theme.muted }]}>
                {new Date(item.timestamp).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
          </View>
        ))
      )}

      <Pressable style={[styles.logoutButton, { borderColor: theme.errorBorder }]} onPress={onLogout}>
        <Feather name="log-out" size={16} color={theme.errorText} />
        <Text style={[styles.logoutText, { color: theme.errorText }]}>Sair da conta</Text>
      </Pressable>
    </ScrollView>
  );
}

function FieldLabel({ label, theme }: { label: string; theme: typeof darkTheme }) {
  return <Text style={[styles.fieldLabel, { color: theme.text }]}>{label}</Text>;
}

function InputShell({
  children,
  icon,
  theme,
}: {
  children: ReactNode;
  icon: keyof typeof Feather.glyphMap;
  theme: typeof darkTheme;
}) {
  return (
    <View style={[styles.inputShell, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
      <Feather name={icon} size={15} color={theme.muted} />
      {children}
    </View>
  );
}

function ErrorMessage({ message, theme }: { message: string; theme: typeof darkTheme }) {
  return (
    <View style={[styles.authErrorBox, { borderColor: theme.errorBorder, backgroundColor: theme.errorBackground }]}>
      <Feather name="alert-circle" size={16} color={theme.errorText} />
      <Text style={[styles.authErrorText, { color: theme.errorText }]}>{message}</Text>
    </View>
  );
}

function PrimaryButton({
  label,
  loading,
  onPress,
  theme,
}: {
  label: string;
  loading: boolean;
  onPress: () => void;
  theme: typeof darkTheme;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={[styles.primaryButton, { backgroundColor: theme.primary, opacity: loading ? 0.75 : 1 }]}
    >
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{label}</Text>}
    </Pressable>
  );
}

function InfoPill({
  icon,
  text,
  theme,
}: {
  icon: keyof typeof Feather.glyphMap;
  text: string;
  theme: typeof darkTheme;
}) {
  return (
    <View style={[styles.infoPill, { backgroundColor: theme.pillBackground, borderColor: theme.border }]}>
      <Feather name={icon} size={13} color={theme.primary} />
      <Text style={[styles.infoText, { color: theme.text }]}>{text}</Text>
    </View>
  );
}

function HistoryDrawer({
  isOpen,
  drawerTranslate,
  theme,
  history,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  drawerTranslate: Animated.Value;
  theme: typeof darkTheme;
  history: QueryHistoryItem[];
  onClose: () => void;
  onSelect: (item: QueryHistoryItem) => void;
}) {
  if (!isOpen) return null;

  return (
    <View style={styles.historyOverlay}>
      <Pressable style={styles.historyBackdrop} onPress={onClose} />

      <Animated.View
        style={[
          styles.historyDrawer,
          {
            backgroundColor: theme.drawerBackground,
            borderColor: theme.border,
            transform: [{ translateX: drawerTranslate }],
          },
        ]}
      >
        <View style={styles.historyHeader}>
          <Text style={[styles.historyTitle, { color: theme.text }]}>HISTÓRICO</Text>

          <Pressable style={[styles.historyCloseButton, { borderColor: theme.border }]} onPress={onClose}>
            <Feather name="x" size={18} color={theme.text} />
          </Pressable>
        </View>

        <View style={styles.historyContent}>
          {history.length === 0 ? (
            <Text style={[styles.emptyHistory, { color: theme.muted }]}>
              Nenhuma consulta realizada ainda.
            </Text>
          ) : (
            history.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => onSelect(item)}
                style={[styles.historyItem, { borderColor: theme.border, backgroundColor: theme.pillBackground }]}
              >
                <Text style={[styles.historyItemText, { color: theme.text }]}>{item.question}</Text>
                <Text style={[styles.historyMeta, { color: theme.muted }]}>{item.category}</Text>
              </Pressable>
            ))
          )}
        </View>
      </Animated.View>
    </View>
  );
}

/* Mantive os componentes de resultado do pacote anterior */

function AnalysisResultView({
  result,
  activeTab,
  setActiveTab,
  theme,
}: {
  result: AnalysisResult;
  activeTab: ResultTab;
  setActiveTab: (tab: ResultTab) => void;
  theme: typeof darkTheme;
}) {
  return (
    <View style={styles.resultSection}>
      <View style={styles.resultTabs}>
        <ResultTabButton label="Interpretação" icon="cpu" value="interpretation" activeTab={activeTab} setActiveTab={setActiveTab} theme={theme} />
        <ResultTabButton label="Script SQL" icon="code" value="script" activeTab={activeTab} setActiveTab={setActiveTab} theme={theme} />
        <ResultTabButton label="Dados" icon="bar-chart-2" value="data" activeTab={activeTab} setActiveTab={setActiveTab} theme={theme} />
      </View>

      {activeTab === "interpretation" && (
        <View style={[styles.resultCard, { backgroundColor: theme.pillBackground, borderColor: theme.border }]}>
          <Text style={[styles.resultTitle, { color: theme.text }]}>Interpretação da pergunta</Text>
          <Text style={[styles.resultParagraph, { color: theme.muted }]}>
            {result.interpretation.intent || result.script.explanation}
          </Text>

          <View style={styles.kpiGrid}>
            <MiniInfoCard label="Confiança" value={`${result.interpretation.confidence}%`} theme={theme} />
            <MiniInfoCard label="Categoria" value={result.interpretation.category ?? "Análise"} theme={theme} />
            <MiniInfoCard label="Período" value={result.interpretation.period ?? "Não informado"} theme={theme} />
          </View>

          {result.interpretation.sapTables.length > 0 && (
            <>
              <Text style={[styles.resultSubtitle, { color: theme.text }]}>Tabelas SAP usadas</Text>
              <View style={styles.tagRow}>
                {result.interpretation.sapTables.map((table) => (
                  <View key={table} style={[styles.tag, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
                    <Text style={[styles.tagText, { color: theme.text }]}>{table}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {result.interpretation.fields.length > 0 && (
            <>
              <Text style={[styles.resultSubtitle, { color: theme.text }]}>Campos detectados</Text>
              {result.interpretation.fields.slice(0, 6).map((field) => (
                <Text key={`${field.sapTable}-${field.sapField}`} style={[styles.fieldText, { color: theme.muted }]}>
                  {field.name} · {field.sapTable}.{field.sapField}
                </Text>
              ))}
            </>
          )}
        </View>
      )}

      {activeTab === "script" && (
        <View style={[styles.resultCard, { backgroundColor: theme.pillBackground, borderColor: theme.border }]}>
          <Text style={[styles.resultTitle, { color: theme.text }]}>Script SQL gerado</Text>
          <Text style={[styles.resultParagraph, { color: theme.muted }]}>{result.script.explanation}</Text>

          <ScrollView horizontal style={[styles.codeBox, { backgroundColor: theme.codeBackground }]}>
            <Text style={styles.codeText}>{result.script.code || "Nenhum SQL retornado pelo backend."}</Text>
          </ScrollView>
        </View>
      )}

      {activeTab === "data" && (
        <View style={[styles.resultCard, { backgroundColor: theme.pillBackground, borderColor: theme.border }]}>
          <Text style={[styles.resultTitle, { color: theme.text }]}>Dados retornados</Text>

          <View style={styles.kpiGrid}>
            {result.kpis.slice(0, 4).map((kpi) => (
              <MiniInfoCard key={kpi.id} label={kpi.label} value={`${kpi.value}${kpi.unit ? ` ${kpi.unit}` : ""}`} theme={theme} />
            ))}
          </View>

          {result.table.executionError ? (
            <Text style={[styles.errorText, { color: theme.errorText }]}>{result.table.executionError}</Text>
          ) : result.table.rows.length === 0 ? (
            <Text style={[styles.resultParagraph, { color: theme.muted }]}>
              O backend não retornou linhas de dados para esta consulta.
            </Text>
          ) : (
            <ScrollView horizontal style={styles.tableScroll}>
              <View>
                <View style={styles.tableRow}>
                  {result.table.columns.slice(0, 5).map((column) => (
                    <Text key={column} style={[styles.tableHeaderCell, { color: theme.text, borderColor: theme.border }]}>
                      {column}
                    </Text>
                  ))}
                </View>

                {result.table.rows.slice(0, 8).map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.tableRow}>
                    {result.table.columns.slice(0, 5).map((column) => (
                      <Text
                        key={`${rowIndex}-${column}`}
                        style={[styles.tableCell, { color: theme.muted, borderColor: theme.border }]}
                        numberOfLines={2}
                      >
                        {String(row[column] ?? "")}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          <Text style={[styles.resultFooter, { color: theme.muted }]}>
            Total: {result.table.totalRows} linhas · {result.table.sapSource}
          </Text>
        </View>
      )}
    </View>
  );
}

function ResultTabButton({
  label,
  icon,
  value,
  activeTab,
  setActiveTab,
  theme,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  value: ResultTab;
  activeTab: ResultTab;
  setActiveTab: (tab: ResultTab) => void;
  theme: typeof darkTheme;
}) {
  const isActive = activeTab === value;

  return (
    <Pressable
      onPress={() => setActiveTab(value)}
      style={[
        styles.resultTabButton,
        {
          borderColor: isActive ? theme.primary : theme.border,
          backgroundColor: isActive ? theme.primarySoft : theme.pillBackground,
        },
      ]}
    >
      <Feather name={icon} size={13} color={isActive ? theme.primary : theme.muted} />
      <Text style={[styles.resultTabText, { color: isActive ? theme.primary : theme.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function MiniInfoCard({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: typeof darkTheme;
}) {
  return (
    <View style={[styles.miniCard, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
      <Text style={[styles.miniCardLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.miniCardValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const lightTheme = {
  background: "#FAF7F2",
  inputBackground: "#FFFFFF",
  text: "#1C1917",
  muted: "#57534E",
  border: "#E7E0D8",
  primary: "#C74217",
  primarySoft: "#FFF1E8",
  buttonBackground: "#FAFAF9",
  pillBackground: "#FFFFFF",
  drawerBackground: "#FAF7F2",
  floatingButtonBackground: "#FFFFFF",
  errorBackground: "#FEF2F2",
  errorBorder: "#FECACA",
  errorText: "#B91C1C",
  successBackground: "#ECFDF5",
  successBorder: "#A7F3D0",
  successText: "#047857",
  codeBackground: "#111827",
};

const darkTheme = {
  background: "#0F0E0C",
  inputBackground: "#171513",
  text: "#F5F5F4",
  muted: "#A8A29E",
  border: "#2F2A24",
  primary: "#D94A00",
  primarySoft: "#2A1710",
  buttonBackground: "#1F1B17",
  pillBackground: "#171513",
  drawerBackground: "#0F0E0C",
  floatingButtonBackground: "#171513",
  errorBackground: "#2B1111",
  errorBorder: "#7F1D1D",
  errorText: "#FCA5A5",
  successBackground: "#052E1A",
  successBorder: "#166534",
  successText: "#86EFAC",
  codeBackground: "#020617",
};

const styles = StyleSheet.create({
  screen: { flex: 1 },

  safeArea: {
    flex: 1,
  },

  fixedTopBar: {
    minHeight: 56,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 86,
    paddingBottom: 42,
  },

  topLogo: { width: 128, height: 34 },

  topActions: { flexDirection: "row", alignItems: "center", gap: 8 },

  themeIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  accountButton: {
    height: 34,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  accountText: { fontSize: 12, fontWeight: "800" },

  loginTextButton: {
    minHeight: 34,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  loginText: {
    fontSize: 12,
    fontWeight: "800",
  },

  createAccountButton: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D94A00",
  },

  createAccountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  historyFloatingButton: {
    position: "absolute",
    left: 20,
    top: 18,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },

  content: { alignItems: "center" },

  title: {
    fontSize: 31,
    lineHeight: 39,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 22,
    letterSpacing: -0.7,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 25,
    textAlign: "center",
    maxWidth: 330,
    marginBottom: 12,
  },

  exampleRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: 34,
    paddingHorizontal: 12,
  },

  examplePrefix: { fontSize: 15, marginRight: 5 },
  example: { fontSize: 15, fontWeight: "800", textAlign: "center" },
  cursor: { fontSize: 15, fontWeight: "800", marginLeft: 2 },

  questionBox: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 18,
  },

  input: { minHeight: 124, padding: 18, fontSize: 16, lineHeight: 25 },

  questionFooter: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },

  hint: { fontSize: 12 },

  generateButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },

  generateButtonText: { fontSize: 15, fontWeight: "900" },

  errorBox: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 18,
  },

  errorText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "600" },

  suggestionsHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
    marginBottom: 12,
  },

  suggestionsIcon: { fontSize: 13 },
  suggestionsTitle: { fontSize: 15 },
  suggestions: { width: "100%", gap: 10, marginBottom: 28 },

  suggestionPill: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  suggestionText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    textAlign: "center",
  },

  infoRow: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginBottom: 4,
  },

  infoPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 38,
  },

  infoText: { fontSize: 12, fontWeight: "600", textAlign: "center" },

  historyOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100 },
  historyBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0, 0, 0, 0.48)" },

  historyDrawer: {
    width: "82%",
    height: "100%",
    borderRightWidth: 1,
    paddingTop: 58,
    paddingHorizontal: 18,
    paddingBottom: 28,
  },

  historyHeader: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 26,
  },

  historyTitle: { fontSize: 13, fontWeight: "900", letterSpacing: 1.4 },

  historyCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  historyContent: { flex: 1 },
  emptyHistory: { fontSize: 14, lineHeight: 22, textAlign: "center", marginTop: 42 },

  historyItem: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10 },
  historyItemText: { fontSize: 14, lineHeight: 20, fontWeight: "700" },
  historyMeta: { fontSize: 12, lineHeight: 18, marginTop: 6 },

  authContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
    justifyContent: "center",
  },

  backButton: { marginBottom: 20 },
  inlineBackButton: { marginBottom: 18 },
  backText: { fontSize: 14, fontWeight: "700" },

  authCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
  },

  authTitle: { fontSize: 26, fontWeight: "900", marginBottom: 6 },
  authSubtitle: { fontSize: 14, lineHeight: 21, marginBottom: 18 },

  tenantBadge: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },

  tenantLogo: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  tenantLogoText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  tenantInfo: { flex: 1 },
  tenantName: { fontSize: 13, fontWeight: "900" },
  tenantText: { fontSize: 12, lineHeight: 17 },

  fieldLabel: { fontSize: 13, fontWeight: "800", marginBottom: 7, marginTop: 10 },

  inputShell: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  authInput: { flex: 1, fontSize: 14, paddingVertical: 10 },

  forgotButton: { alignSelf: "flex-end", marginTop: 10, marginBottom: 16 },
  linkText: { fontSize: 14, fontWeight: "800" },

  primaryButton: {
    minHeight: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },

  authFooterRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },

  authFooterText: { fontSize: 14 },

  authDivider: {
    height: 1,
    marginTop: 24,
    marginBottom: 14,
  },

  domainHint: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },

  authErrorBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    gap: 9,
    marginBottom: 14,
  },

  authErrorText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "600" },

  successBox: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 14 },
  successText: { fontSize: 13, lineHeight: 19, fontWeight: "700" },
  successCenter: { alignItems: "center" },
  successIcon: { width: 58, height: 58, borderWidth: 1, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  successEmail: { fontSize: 14, fontWeight: "900", marginBottom: 18 },
  infoNotice: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 18 },
  infoNoticeText: { fontSize: 12, lineHeight: 18, textAlign: "center" },

  accountContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 42,
  },

  accountTitle: { fontSize: 26, fontWeight: "900", marginBottom: 6 },
  accountSubtitle: { fontSize: 14, lineHeight: 21, marginBottom: 20 },

  accountCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
  },

  accountUserRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  accountAvatar: { width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  accountUserInfo: { flex: 1 },
  accountName: { fontSize: 17, fontWeight: "900", marginBottom: 3 },
  accountMeta: { fontSize: 12 },
  accountDivider: { height: 1, marginVertical: 16 },
  accountInfoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  accountInfoText: { flex: 1, fontSize: 14, fontWeight: "700" },

  accountSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  accountSectionTitle: { fontSize: 15, fontWeight: "900" },
  accountHistoryCount: { marginLeft: "auto", fontSize: 12 },
  accountHistoryItem: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10 },
  accountHistoryMetaRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  accountHistoryCategory: { fontSize: 12, fontWeight: "900" },

  logoutButton: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },

  logoutText: { fontSize: 14, fontWeight: "900" },

  resultSection: { width: "100%", marginTop: 34, gap: 14 },
  resultTabs: { flexDirection: "row", gap: 8 },

  resultTabButton: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 8,
  },

  resultTabText: { fontSize: 11, fontWeight: "900", textAlign: "center" },
  resultCard: { width: "100%", borderWidth: 1, borderRadius: 20, padding: 16 },
  resultTitle: { fontSize: 17, fontWeight: "900", marginBottom: 10 },
  resultSubtitle: { fontSize: 14, fontWeight: "900", marginTop: 18, marginBottom: 10 },
  resultParagraph: { fontSize: 14, lineHeight: 21 },
  kpiGrid: { width: "100%", gap: 10, marginTop: 14 },

  miniCard: { borderWidth: 1, borderRadius: 16, padding: 14 },
  miniCardLabel: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
  miniCardValue: { fontSize: 15, fontWeight: "900" },

  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 10 },
  tagText: { fontSize: 12, fontWeight: "800" },
  fieldText: { fontSize: 13, lineHeight: 20, marginBottom: 4 },

  codeBox: { borderRadius: 16, padding: 14, marginTop: 14 },
  codeText: { color: "#E5E7EB", fontSize: 12, lineHeight: 18, fontFamily: "monospace" },

  tableScroll: { marginTop: 14 },
  tableRow: { flexDirection: "row" },
  tableHeaderCell: { width: 130, borderWidth: 1, padding: 8, fontSize: 12, fontWeight: "900" },
  tableCell: { width: 130, borderWidth: 1, padding: 8, fontSize: 12, lineHeight: 17 },
  resultFooter: { fontSize: 12, lineHeight: 18, marginTop: 12 },
});
