import { useState, useMemo, forwardRef } from "react";
import { Check, X, Search, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AVAILABLE_LANGUAGES,
  searchLanguages,
  getLanguageName,
  type Language,
} from "@/lib/languageConfig";

interface LanguageSelectorProps {
  selectedLanguages: string[];
  onLanguagesChange: (languages: string[]) => void;
  maxLanguages?: number;
  label?: string;
  placeholder?: string;
  description?: string;
  excludeEnglish?: boolean; // For client form where English is default
}

export const LanguageSelector = forwardRef<HTMLDivElement, LanguageSelectorProps>(({
  selectedLanguages,
  onLanguagesChange,
  maxLanguages = 5,
  label = "Languages Spoken",
  placeholder = "Search languages...",
  description,
  excludeEnglish = false,
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLanguages = useMemo(() => {
    let languages = searchLanguages(searchQuery);
    if (excludeEnglish) {
      languages = languages.filter(lang => lang.code !== "en");
    }
    return languages;
  }, [searchQuery, excludeEnglish]);

  const toggleLanguage = (code: string) => {
    if (selectedLanguages.includes(code)) {
      onLanguagesChange(selectedLanguages.filter(lang => lang !== code));
    } else if (selectedLanguages.length < maxLanguages) {
      onLanguagesChange([...selectedLanguages, code]);
    }
  };

  const removeLanguage = (code: string) => {
    onLanguagesChange(selectedLanguages.filter(lang => lang !== code));
  };

  return (
    <div ref={ref} className="space-y-2">
      <Label className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-primary" />
        {label}
      </Label>
      
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {/* Selected languages display */}
      {selectedLanguages.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedLanguages.map(code => (
            <Badge
              key={code}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              {getLanguageName(code)}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => removeLanguage(code)}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-muted-foreground"
            disabled={selectedLanguages.length >= maxLanguages}
          >
            <Search className="w-4 h-4 mr-2" />
            {selectedLanguages.length >= maxLanguages
              ? `Maximum ${maxLanguages} languages selected`
              : placeholder
            }
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-3 border-b border-border">
            <Input
              placeholder="Search languages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
              autoFocus
            />
          </div>
          <ScrollArea className="h-60">
            <div className="p-2 space-y-1">
              {filteredLanguages.map((language) => {
                const isSelected = selectedLanguages.includes(language.code);
                return (
                  <button
                    key={language.code}
                    type="button"
                    onClick={() => toggleLanguage(language.code)}
                    disabled={!isSelected && selectedLanguages.length >= maxLanguages}
                    className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${
                      isSelected
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted disabled:opacity-50"
                    }`}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{language.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {language.nativeName}
                      </span>
                    </div>
                    {isSelected && <Check className="w-4 h-4" />}
                  </button>
                );
              })}
              {filteredLanguages.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No languages found
                </p>
              )}
            </div>
          </ScrollArea>
          <div className="p-2 border-t border-border bg-muted/50">
            <p className="text-xs text-muted-foreground text-center">
              {selectedLanguages.length}/{maxLanguages} languages selected
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
});

LanguageSelector.displayName = "LanguageSelector";
