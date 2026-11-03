import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Lock, Mail, TriangleAlert, User } from "lucide-react-native";
import { useTheme } from "@/theme";
import { useAuth } from "@/providers/auth-provider";
import { AuthShell } from "@/components/layout/auth-shell";
import { BootErrorNotice } from "@/components/layout/boot-error";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name"),
    email: z.email("Enter a valid email address"),
    password: z.string().min(8, "Use at least 8 characters"),
    passwordConfirmation: z.string(),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: "Passwords do not match",
    path: ["passwordConfirmation"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const { colors, fonts } = useTheme();
  const { signUp } = useAuth();
  const router = useRouter();
  const [rootError, setRootError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      passwordConfirmation: "",
    },
  });

  const onSubmit = async (values: RegisterForm) => {
    setRootError(null);
    try {
      await signUp(values);
      // The guard swaps to the tabs tree. A brand-new account has no business
      // yet, so the tabs layout shows the workspace notice.
    } catch (error) {
      setRootError(
        error instanceof Error ? error.message : "Could not create the account.",
      );
    }
  };

  return (
    <AuthShell
      eyebrow="Mobile POS"
      title="Create your account"
      subtitle="Start with an account, then finish your business and outlet setup in the Velora web app."
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
        name="name"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label="Full name"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.name?.message}
            placeholder="Jane Velora"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            leftIcon={<User size={17} color={colors.inkMuted} />}
          />
        )}
      />

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
            placeholder="At least 8 characters"
            secureTextEntry
            passwordToggle
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            leftIcon={<Lock size={17} color={colors.inkMuted} />}
          />
        )}
      />

      <Controller
        control={control}
        name="passwordConfirmation"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label="Confirm password"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.passwordConfirmation?.message}
            placeholder="Repeat your password"
            secureTextEntry
            passwordToggle
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={() => void handleSubmit(onSubmit)()}
            leftIcon={<Lock size={17} color={colors.inkMuted} />}
          />
        )}
      />

      <Button
        label="Create account"
        onPress={() => void handleSubmit(onSubmit)()}
        loading={isSubmitting}
        fullWidth
        icon={<ArrowRight size={17} color={colors.primaryForeground} />}
        style={styles.submit}
      />

      <View style={styles.switchRow}>
        <Text variant="bodySmall">Already have an account?</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          onPress={() => router.push("/login")}
          hitSlop={8}
        >
          <Text
            variant="bodySmall"
            color={colors.primary}
            style={{ fontFamily: fonts.semibold }}
          >
            Sign in
          </Text>
        </Pressable>
      </View>
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
