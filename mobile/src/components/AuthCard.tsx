import { ReactNode } from "react";
import { Text, View } from "react-native";

type AuthCardProps = {
  title: string;
  subtitle?: string;
  containerClassName?: string;
  children: ReactNode;
};

export default function AuthCard({
  title,
  subtitle,
  containerClassName = "",
  children,
}: AuthCardProps) {
  return (
    <View className={`flex-1 health-bg justify-center px-6 ${containerClassName}`}>
      <View className="health-card w-full">
        <Text className="text-2xl font-bold health-text mb-2">{title}</Text>

        {subtitle ? (
          <Text className="health-text-secondary mb-6">{subtitle}</Text>
        ) : null}

        {children}
      </View>
    </View>
  );
}