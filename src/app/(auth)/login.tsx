import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Lock, Mail, TriangleAlert } from "lucide-react-native";
import { useTheme } from "@/theme";
import { useAuth } from "@/providers/auth-provider";
import { AuthShell } from "@/components/layout/auth-shell";
import { BootErrorNotice } from "@/components/layout/boot-error";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { colors, fonts } = useTheme();
  const { signIn } = useAuth();
  const router = useRouter();
  const [rootError, setRootError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginForm) => {
    setRootError(null);
    try {
      await signIn(values);
      // The root Stack.Protected guard swaps to the tabs tree as soon as
      // `status` becomes authenticated; no manual navigation is needed.
    } catch (error) {
      setRootError(
        error instanceof Error ? error.message : "Could not sign in.",
      );
    }
  };

  return (
    <AuthShell
      eyebrow="Mobile POS"
      title="Welcome back"
      subtitle="Sign in to see today's sales, browse the catalogue and check your workspace."
    >
      <BootErrorNotice />

      {rootError ? (
        <View
          style={[
            styles.errorBox,
            {
              backgroundColor: colors.dangerBg,
              borderColor: colors.dangerBorder,
            },
          ]}
        >
          <TriangleAlert size={16} color={colors.danger} />
          <Text variant="caption" color={colors.danger} style={styles.errorText}>
            {rootError}
          </Text>
        </View>
      ) : null}

      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label="Email"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.email?.message}
            placeholder="you@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            leftIcon={<Mail size={17} color={colors.inkMuted} />}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label="Password"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.password?.message}
            placeholder="Your password"
            secureTextEntry
            passwordToggle
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={() => void handleSubmit(onSubmit)()}
            leftIcon={<Lock size={17} color={colors.inkMuted} />}
          />
        )}
      />

      <Button
        label="Sign in"
        onPress={() => void handleSubmit(onSubmit)()}
        loading={isSubmitting}
        fullWidth
        icon={<ArrowRight size={17} color={colors.primaryForeground} />}
        style={styles.submit}
      />

      <View style={styles.switchRow}>
        <Text variant="bodySmall">New to Velora?</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create an account"
          onPress={() => router.push("/register")}
          hitSlop={8}
        >
          <Text
            variant="bodySmall"
            color={colors.primary}
            style={{ fontFamily: fonts.semibold }}
          >
            Create an account
          </Text>
        </Pressable>
      </View>

      {__DEV__ ? (
        <Text variant="caption" align="center">
          Local demo account: admin@velora.test / password
        </Text>
      ) : null}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    flex: 1,
  },
  submit: {
    marginTop: 4,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    flexWrap: "wrap",
  },
});
