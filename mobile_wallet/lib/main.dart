import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

import 'services/wallet_service.dart';
import 'services/network_service.dart';
import 'services/storage_service.dart';
import 'screens/home_screen.dart';
import 'utils/theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize services
  final storageService = StorageService();
  await storageService.init();

  final networkService = NetworkService();
  final walletService = WalletService(storageService, networkService);

  // Initialize wallet
  await walletService.init();

  runApp(MyApp(
    walletService: walletService,
    networkService: networkService,
    storageService: storageService,
  ));
}

class MyApp extends StatelessWidget {
  final WalletService walletService;
  final NetworkService networkService;
  final StorageService storageService;

  const MyApp({
    Key? key,
    required this.walletService,
    required this.networkService,
    required this.storageService,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Set system UI overlay style
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        statusBarBrightness: Brightness.dark,
      ),
    );

    return MultiProvider(
      providers: [
        ChangeNotifierProvider<WalletService>.value(value: walletService),
        ChangeNotifierProvider<NetworkService>.value(value: networkService),
        Provider<StorageService>.value(value: storageService),
      ],
      child: MaterialApp(
        title: 'DID Wallet Mobile',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          primarySwatch: AppTheme.primarySwatch,
          primaryColor: AppTheme.primaryColor,
          scaffoldBackgroundColor: AppTheme.backgroundColor,
          fontFamily: GoogleFonts.inter().fontFamily,
          appBarTheme: AppBarTheme(
            backgroundColor: AppTheme.primaryColor,
            foregroundColor: Colors.white,
            elevation: 0,
            systemOverlayStyle: SystemUiOverlayStyle.light,
            titleTextStyle: GoogleFonts.inter(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              foregroundColor: Colors.white,
              elevation: 2,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            ),
          ),
          cardTheme: CardThemeData(
            elevation: 4,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          ),
          inputDecorationTheme: InputDecorationTheme(
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: AppTheme.borderColor),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: AppTheme.primaryColor, width: 2),
            ),
            filled: true,
            fillColor: AppTheme.surfaceColor,
            contentPadding: const EdgeInsets.all(16),
          ),
          textTheme: GoogleFonts.interTextTheme(
            Theme.of(context).textTheme,
          ).copyWith(
            headlineLarge: GoogleFonts.inter(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: AppTheme.textPrimaryColor,
            ),
            headlineMedium: GoogleFonts.inter(
              fontSize: 24,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimaryColor,
            ),
            bodyLarge: GoogleFonts.inter(
              fontSize: 16,
              color: AppTheme.textPrimaryColor,
            ),
            bodyMedium: GoogleFonts.inter(
              fontSize: 14,
              color: AppTheme.textSecondaryColor,
            ),
          ),
        ),
        home: const HomeScreen(),
      ),
    );
  }
}
