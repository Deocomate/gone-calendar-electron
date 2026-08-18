import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

export const resources = {
  vi: {
    translation: {
      appName: 'Gone Calendar',
      views: {
        day: 'Ngày',
        week: 'Tuần',
        month: 'Tháng',
        year: 'Năm',
        list: 'Danh sách'
      },
      nav: {
        today: 'Hôm nay',
        prev: 'Trước',
        next: 'Sau'
      },
      actions: {
        newEvent: 'Tạo sự kiện',
        quickAdd: 'Thêm nhanh',
        settings: 'Cài đặt',
        sync: 'Đồng bộ',
        refresh: 'Làm mới'
      },
      sidebar: {
        myCalendars: 'Lịch của tôi',
        localCalendar: 'Lịch cá nhân',
        accounts: 'Tài khoản đã kết nối',
        addAccount: 'Thêm tài khoản',
        lunarEnabled: 'Lịch âm & Tiết khí',
        weekNumbers: 'Số thứ tự tuần'
      },
      settings: {
        title: 'Cài đặt ứng dụng',
        general: 'Chung',
        language: 'Ngôn ngữ',
        theme: 'Giao diện',
        themeSystem: 'Hệ thống',
        themeDark: 'Tối',
        themeLight: 'Sáng',
        accounts: 'Tài khoản',
        notifications: 'Thông báo',
        about: 'Giới thiệu',
        version: 'Phiên bản',
        close: 'Đóng'
      },
      status: {
        ready: 'Sẵn sàng',
        syncing: 'Đang đồng bộ...',
        offline: 'Chế độ ngoại tuyến'
      }
    }
  },
  en: {
    translation: {
      appName: 'Gone Calendar',
      views: {
        day: 'Day',
        week: 'Week',
        month: 'Month',
        year: 'Year',
        list: 'List'
      },
      nav: {
        today: 'Today',
        prev: 'Previous',
        next: 'Next'
      },
      actions: {
        newEvent: 'New Event',
        quickAdd: 'Quick Add',
        settings: 'Settings',
        sync: 'Sync',
        refresh: 'Refresh'
      },
      sidebar: {
        myCalendars: 'My Calendars',
        localCalendar: 'Personal Calendar',
        accounts: 'Connected Accounts',
        addAccount: 'Add Account',
        lunarEnabled: 'Lunar & Solar Terms',
        weekNumbers: 'Week Numbers'
      },
      settings: {
        title: 'Application Settings',
        general: 'General',
        language: 'Language',
        theme: 'Theme',
        themeSystem: 'System',
        themeDark: 'Dark',
        themeLight: 'Light',
        accounts: 'Accounts',
        notifications: 'Notifications',
        about: 'About',
        version: 'Version',
        close: 'Close'
      },
      status: {
        ready: 'Ready',
        syncing: 'Syncing...',
        offline: 'Offline mode'
      }
    }
  }
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'vi',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
})

export default i18n
