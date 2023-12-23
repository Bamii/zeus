use crate::models::package_manager::PackageManager;
use crate::package_managers::default::default as default_package_manager;
use clap::arg;

pub fn install_command() -> clap::Command {
    clap::Command::new("package")
        .arg(
            arg!(-U <PACKAGE> ... "install a package")
                .num_args(1..)
                .id("install")
                .action(clap::ArgAction::Append),
        )
        .subcommand(clap::Command::new("install").args(&[arg!([NAME] ...).id("install")]))
        .subcommand(clap::Command::new("add").args(&[arg!([NAME] ...).id("install")]))
}

pub fn uninstall_command() -> clap::Command {
    clap::Command::new("package")
        .arg(
            arg!(-R <PACKAGE> ... "uninstall a package")
                .num_args(1..)
                .id("uninstall")
                .action(clap::ArgAction::Append),
        )
        .subcommand(clap::Command::new("uninstall").args(&[arg!([NAME] ...).id("uninstall")]))
        .subcommand(clap::Command::new("remove").args(&[arg!([NAME] ...).id("uninstall")]))
}

fn install(arr: &Vec<String>) -> Option<(String, Vec<String>)> {
    println!("");
    println!("running install command");
    let _  = run_command("rpm".to_string(), "-U".to_string(), arr[1].clone()].to_vec());
    Some((String::from(""), vec![]))
}

fn uninstall(arr: &Vec<String>) -> Option<(String, Vec<String>)> {
    println!("");
    println!("running install command");
    let _  = run_command("rpm".to_string(), "-R".to_string(), arr[1].clone()].to_vec());
    Some((String::from(""), vec![]))
}


pub fn default() -> PackageManager {
    PackageManager {
        install,
        uninstall,
        uninstall_command,
        install_command,
        name: String::from("rpm"),
        packages: vec!["rpm".to_string()],
        ..default_package_manager()
    }
}
