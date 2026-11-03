import { Search, X } from "lucide-react-native";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";
import { TextField } from "./text-field";

type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
  autoFocus?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  onSubmitEditing?: () => void;
};

/** Text field with a leading magnifier and a clear button when non-empty. */
export function SearchField({
  value,
  onChangeText,
  placeholder = "Search",
  accessibilityLabel = "Search",
  autoFocus = false,
  containerStyle,
  onSubmitEditing,
}: SearchFieldProps) {
  const { colors } = useTheme();

  return (
    <TextField
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      accessibilityLabel={accessibilityLabel}
      autoFocus={autoFocus}
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="search"
      onSubmitEditing={onSubmitEditing}
      containerStyle={containerStyle}
      leftIcon={<Search size={17} color={colors.inkMuted} />}
      rightIcon={
        value.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={8}
            onPress={() => onChangeText("")}
            style={{ paddingHorizontal: 4 }}
          >
            <X size={17} color={colors.inkMuted} />
          </Pressable>
        ) : undefined
      }
    />
  );
}
