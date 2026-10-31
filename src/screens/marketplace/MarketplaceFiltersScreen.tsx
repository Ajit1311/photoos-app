import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { typography } from "../../theme/typography";
import { useAppSettings } from "../../context/AppSettingsContext";

const locations = [
  "Kolhapur",
  "Sangli",
  "Satara",
  "Belagavi",
  "Goa",
  "Pune",
];

const areasByLocation: Record<string, string[]> = {
  Kolhapur: [
    "Kolhapur",
    "Gadhinglaj",
    "Gargoti",
    "Ajra",
    "Chandgad",
    "Kagal",
    "Ichalkaranji",
    "Hatkanangale",
  ],

  Sangli: [
    "Sangli",
    "Miraj",
    "Islampur",
    "Tasgaon",
    "Vita",
    "Jat",
    "Kavathe Mahankal",
  ],

  Satara: [
    "Satara",
    "Karad",
    "Phaltan",
    "Wai",
    "Patan",
    "Mahabaleshwar",
    "Koregaon",
  ],

  Belagavi: [
    "Belagavi",
    "Gokak",
    "Bailhongal",
    "Chikodi",
    "Athani",
    "Nipani",
    "Khanapur",
  ],

  Goa: [
    "Panaji",
    "Margao",
    "Vasco da Gama",
    "Mapusa",
    "Ponda",
    "Calangute",
    "Candolim",
    "Bicholim",
    "Curchorem",
    "Canacona",
    "Porvorim",
    "Quepem",
    "Sanguem",
    "Pernem",
  ],

  Pune: [
    "Pune",
    "Pimpri-Chinchwad",
    "Hinjawadi",
    "Kothrud",
    "Hadapsar",
    "Baner",
    "Wakad",
    "Viman Nagar",
    "Kharadi",
    "Kondhwa",
    "Aundh",
    "Katraj",
    "Shivajinagar",
    "Koregaon Park",
  ],
};

const priceRanges = [
  "Any Price",
  "Under ₹2,000",
  "₹2,000 – ₹5,000",
  "₹5,000 – ₹10,000",
  "₹10,000 – ₹25,000",
  "₹25,000+",
];

const ratingOptions = ["Any", "4+", "4.5+", "4.8+"];

const services = [
  "Wedding",
  "Pre-Wedding",
  "Maternity",
  "Baby Shoot",
  "Car Delivery",
  "Birthday",
  "Engagement",
  "Portrait",
  "Events",
  "Cinematic",
  "Drone",
  "Album",
  "Product",
];

type PickerType = "location" | "area" | "price" | null;

export default function MarketplaceFiltersScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useAppSettings();

  const [location, setLocation] = useState("");
  const [area, setArea] = useState("");
  const [priceRange, setPriceRange] = useState("Any Price");
  const [rating, setRating] = useState("Any");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [picker, setPicker] = useState<PickerType>(null);

  const clearFilters = () => {
    setLocation("");
    setArea("");
    setPriceRange("Any Price");
    setRating("Any");
    setSelectedServices([]);
  };

  const toggleService = (service: string) => {
    setSelectedServices((current) =>
      current.includes(service)
        ? current.filter((item) => item !== service)
        : [...current, service]
    );
  };

  const pickerTitle =
    picker === "location"
      ? "Select Location"
      : picker === "area"
        ? "Select Area"
        : "Select Price Range";

  const pickerOptions =
    picker === "location"
      ? locations
      : picker === "area"
        ? (location
            ? areasByLocation[location] || []
            : locations)
        : priceRanges;

  const selectPickerValue = (value: string) => {
    if (picker === "location") {
      setLocation(value);
      setArea("");
    } else if (picker === "area") {
      setArea(value);
    } else {
      setPriceRange(value);
    }

    setPicker(null);
  };

  const applyFilters = () => {
    navigation.navigate("Main", {
      screen: "Marketplace",
      params: {
        filters: {
          location,
          area,
          priceRange,
          services: selectedServices,
        },
      },
    });
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.headerButton,
            { backgroundColor: theme.surface },
          ]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={21}
            color={theme.text}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.title,
            { color: theme.text },
          ]}
        >
          Filters
        </Text>

        <TouchableOpacity onPress={clearFilters}>
          <Text
            style={[
              styles.clear,
              { color: theme.primary },
            ]}
          >
            Clear
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <FilterBox
          label="Location"
          value={location || "All locations"}
          onPress={() => setPicker("location")}
          theme={theme}
        />

        <FilterBox
          label="Area"
          value={area || "All areas"}
          onPress={() => setPicker("area")}
          theme={theme}
        />

        <FilterBox
          label="Price Range"
          value={priceRange}
          onPress={() => setPicker("price")}
          theme={theme}
        />

        <Text
          style={[
            styles.label,
            { color: theme.text },
          ]}
        >
          Rating
        </Text>

        <View style={styles.ratingOptions}>
          {ratingOptions.map((item) => {
            const active = rating === item;

            return (
              <TouchableOpacity
                key={item}
                activeOpacity={0.8}
                onPress={() => setRating(item)}
                style={[
                  styles.ratingOption,
                  {
                    backgroundColor: active
                      ? theme.primary
                      : theme.surface,
                    borderColor: active
                      ? theme.primary
                      : theme.border,
                  },
                ]}
              >
                <Ionicons
                  name="star"
                  size={14}
                  color={active ? "#FFFFFF" : "#E3A51B"}
                />

                <Text
                  style={[
                    styles.ratingOptionText,
                    {
                      color: active
                        ? "#FFFFFF"
                        : theme.text,
                    },
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>


        <View style={styles.chips}>
          {services.map((service) => {
            const active = selectedServices.includes(service);

            return (
              <TouchableOpacity
                key={service}
                activeOpacity={0.8}
                onPress={() => toggleService(service)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active
                      ? theme.primary
                      : theme.surface,
                    borderColor: active
                      ? theme.primary
                      : theme.border,
                  },
                ]}
              >
                {active && (
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color="#FFFFFF"
                  />
                )}

                <Text
                  style={[
                    styles.chipText,
                    {
                      color: active
                        ? "#FFFFFF"
                        : theme.text,
                    },
                  ]}
                >
                  {service}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottom,
          { backgroundColor: theme.background },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.apply,
            { backgroundColor: theme.primary },
          ]}
          onPress={applyFilters}
        >
          <Text style={styles.applyText}>
            Apply Filters
          </Text>

          <Ionicons
            name="arrow-forward"
            size={18}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      <Modal
        visible={picker !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPicker(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: theme.surface },
            ]}
          >
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  { color: theme.text },
                ]}
              >
                {pickerTitle}
              </Text>

              <TouchableOpacity
                onPress={() => setPicker(null)}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.text}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.options}
            >
              {pickerOptions.map((option) => {
                const selected =
                  option === location ||
                  option === area ||
                  option === priceRange;

                return (
                  <TouchableOpacity
                    key={option}
                    activeOpacity={0.8}
                    onPress={() =>
                      selectPickerValue(option)
                    }
                    style={[
                      styles.option,
                      {
                        backgroundColor: selected
                          ? theme.primarySoft
                          : theme.surfaceSoft,
                        borderColor: selected
                          ? theme.primary
                          : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: selected
                            ? theme.primary
                            : theme.text,
                        },
                      ]}
                    >
                      {option}
                    </Text>

                    {selected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={theme.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FilterBox({
  label,
  value,
  onPress,
  theme,
}: {
  label: string;
  value: string;
  onPress: () => void;
  theme: any;
}) {
  return (
    <View style={styles.filterBox}>
      <Text
        style={[
          styles.label,
          { color: theme.text },
        ]}
      >
        {label}
      </Text>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[
          styles.select,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        <Text
          style={[
            styles.selectText,
            {
              color: value.startsWith("All")
                ? theme.textMuted
                : theme.text,
            },
          ]}
        >
          {value}
        </Text>

        <Ionicons
          name="chevron-down"
          size={18}
          color={theme.textMuted}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    height: 92,
    paddingHorizontal: 20,
    paddingTop: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    ...typography.title2,
  },

  clear: {
    ...typography.button,
    fontWeight: "600",
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 140,
  },

  filterBox: {
    marginBottom: 20,
  },

  label: {
    ...typography.caption,
    fontWeight: "600",
    marginBottom: 9,
  },

  select: {
    height: 52,
    paddingHorizontal: 15,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectText: {
    ...typography.callout,
  },

  ratingOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginBottom: 28,
  },

  ratingOption: {
    height: 38,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  ratingOptionText: {
    ...typography.caption,
    fontWeight: "500",
  },

  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginBottom: 28,
  },

  chip: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  chipText: {
    ...typography.caption,
  },

  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
  },

  apply: {
    height: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  applyText: {
    color: "#FFFFFF",
    ...typography.button,
    fontWeight: "600",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },

  modalSheet: {
    maxHeight: "72%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },

  modalHandle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#A1A1AA",
    marginBottom: 18,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  modalTitle: {
    ...typography.title3,
  },

  options: {
    gap: 9,
    paddingBottom: 10,
  },

  option: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  optionText: {
    ...typography.callout,
    fontWeight: "500",
  },
});
